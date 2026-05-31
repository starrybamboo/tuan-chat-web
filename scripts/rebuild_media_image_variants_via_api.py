#!/usr/bin/env python3
"""按 current original 重新生成图片变体，并回写 uploadedQualities。"""

from __future__ import annotations

import argparse
import concurrent.futures
import io
import json
import os
import sys
import threading
from dataclasses import dataclass
from typing import Any

import psycopg
import redis
import requests
from PIL import Image, ImageOps, UnidentifiedImageError
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


QUALITY_ORIGINAL = "original"
QUALITY_LOW = "low"
QUALITY_MEDIUM = "medium"
QUALITY_HIGH = "high"
UPLOADED_QUALITIES_KEY = "uploadedQualities"
KB = 1024
IMAGE_ORIGINAL_MAX_BYTES = 3 * 1024 * 1024
IMAGE_MAX_ITERATION = 10
IMAGE_OUTER_ROUNDS = 20
IMAGE_EDGE_SCALE = 0.95
IMAGE_ROUND_EDGE_SCALE = 0.75
IMAGE_INITIAL_QUALITY = 1.0
IMAGE_QUALITY_DECAY = 0.95
VARIANT_PROFILES = {
    QUALITY_LOW: {"max_edge": 200, "max_bytes": 40 * KB, "quality": 1.0},
    QUALITY_MEDIUM: {"max_edge": 512, "max_bytes": 150 * KB, "quality": 1.0},
    QUALITY_HIGH: {"max_edge": 2560, "max_bytes": 800 * KB, "quality": 1.0},
}


@dataclass(frozen=True)
class Settings:
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    redis_host: str
    redis_port: int
    redis_password: str
    media_api_base_url: str
    media_public_base_url: str


@dataclass
class RebuildPlan:
    file_id: int
    source_original_size: int
    target_original_size: int
    target_original_sha256: str
    target_original_bytes: bytes
    original_changed: bool
    needs_original_sync: bool
    target_qualities: list[str]
    outputs: dict[str, bytes]


@dataclass
class RowResult:
    file_id: int
    action: str
    source_original_size: int
    target_original_size: int
    target_qualities: list[str]
    uploaded_qualities: list[str]
    notes: str = ""


def env_or(default: str, *names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and value != "":
            return value
    return default


def configure_stdout() -> None:
    stream = getattr(sys, "stdout", None)
    if stream is None or not hasattr(stream, "reconfigure"):
        return
    try:
        stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="按新规则重建 image low/medium/high，并回写 uploadedQualities。")
    parser.add_argument("--file-ids", nargs="*", type=int, default=[], help="仅处理这些 media_file.id")
    parser.add_argument("--start-id", type=int, default=0, help="按 id 顺序处理时，从哪个 id 之后开始")
    parser.add_argument("--end-id", type=int, default=0, help="按 id 顺序处理时，处理到哪个 id 为止；0 表示不限制")
    parser.add_argument("--updated-before", default="", help="仅处理 updated_at 早于这个时间的行（例如 2026-05-30 23:32:12）")
    parser.add_argument("--limit", type=int, default=0, help="最多处理多少条；0 表示不限制")
    parser.add_argument("--workers", type=int, default=4, help="并发 worker 数，建议 1~8")
    parser.add_argument("--timeout", type=int, default=30, help="单次 HTTP 请求超时秒数")
    parser.add_argument("--auth-token", default="", help="直接指定 Bearer token")
    parser.add_argument("--auth-user-id", type=int, default=10001, help="未显式传 auth-token 时，从 Redis 取哪个用户的 token")
    parser.add_argument("--apply", action="store_true", help="实际执行上传和写库；默认 dry-run")
    return parser.parse_args()


def load_settings() -> Settings:
    return Settings(
        db_host=env_or("24.233.10.150", "TUANCHAT_POSTGRESQL_IP"),
        db_port=int(env_or("15432", "TUANCHAT_POSTGRESQL_PORT")),
        db_name=env_or("test_db", "TUANCHAT_POSTGRESQL_DB"),
        db_user=env_or("postgresql", "TUANCHAT_POSTGRESQL_USERNAME"),
        db_password=env_or("K3e8u0ezVXNb4pZG9n04", "TUANCHAT_POSTGRESQL_PASSWORD"),
        redis_host=env_or("24.233.10.150", "TUANCHAT_REDIS_HOST"),
        redis_port=int(env_or("16379", "TUANCHAT_REDIS_PORT")),
        redis_password=env_or("B3dG8tY5nH9mX2Fw6K", "TUANCHAT_REDIS_PASSWORD"),
        media_api_base_url=env_or("https://api.tuan.chat/api", "TUANCHAT_MEDIA_API_BASE_URL", "MEDIA_BASE_URL"),
        media_public_base_url=env_or("https://media.tuan.chat", "TUANCHAT_MEDIA_PUBLIC_BASE_URL", "MEDIA_PUBLIC_BASE_URL"),
    )


def build_dsn(settings: Settings) -> str:
    return (
        f"host={settings.db_host} "
        f"port={settings.db_port} "
        f"dbname={settings.db_name} "
        f"user={settings.db_user} "
        f"password={settings.db_password} "
        "options='-c search_path=tuanchat,public'"
    )


def shard(file_id: int) -> str:
    return f"{file_id % 1000:03d}"


def build_original_public_url(settings: Settings, file_id: int) -> str:
    return f"{settings.media_public_base_url.rstrip('/')}/media/v1/files/{shard(file_id)}/{file_id}/original"


def normalize_metadata(raw_metadata: Any) -> dict[str, Any]:
    if raw_metadata is None:
        return {}
    if isinstance(raw_metadata, dict):
        return dict(raw_metadata)
    if isinstance(raw_metadata, str):
        parsed = json.loads(raw_metadata)
        if isinstance(parsed, dict):
            return parsed
    raise TypeError(f"无法识别的 metadata 类型: {type(raw_metadata)!r}")


def normalize_uploaded_qualities(metadata: dict[str, Any]) -> list[str]:
    value = metadata.get(UPLOADED_QUALITIES_KEY)
    if not isinstance(value, list):
        return []
    normalized: list[str] = []
    for item in value:
        if item in (QUALITY_ORIGINAL, QUALITY_LOW, QUALITY_MEDIUM, QUALITY_HIGH):
            normalized.append(item)
    return normalized


def next_uploaded_qualities(original_size: int) -> list[str]:
    qualities = [QUALITY_ORIGINAL]
    for quality in (QUALITY_LOW, QUALITY_MEDIUM, QUALITY_HIGH):
        if original_size > VARIANT_PROFILES[quality]["max_bytes"]:
            qualities.append(quality)
    return qualities


def replace_media_file_id(node: Any, old_file_id: int, new_file_id: int) -> tuple[Any, int]:
    if isinstance(node, dict):
        next_node: dict[str, Any] = {}
        replaced = 0
        for key, value in node.items():
            next_value, count = replace_media_file_id(value, old_file_id, new_file_id)
            if key == "fileId" and value == old_file_id:
                next_value = new_file_id
                count += 1
            next_node[key] = next_value
            replaced += count
        return next_node, replaced
    if isinstance(node, list):
        next_list: list[Any] = []
        replaced = 0
        for item in node:
            next_item, count = replace_media_file_id(item, old_file_id, new_file_id)
            next_list.append(next_item)
            replaced += count
        return next_list, replaced
    return node, 0


def resolve_auth_token(args: argparse.Namespace, settings: Settings) -> str:
    if args.auth_token:
        return args.auth_token.strip()
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        password=settings.redis_password,
        decode_responses=True,
    )
    session_key = f"Authorization:login:session:{args.auth_user_id}"
    raw = redis_client.get(session_key)
    if not raw:
        raise RuntimeError(f"Redis 中找不到登录会话: {session_key}")
    data = json.loads(raw)
    token_sign_list = data.get("tokenSignList")
    if not isinstance(token_sign_list, list) or len(token_sign_list) < 2:
        raise RuntimeError(f"会话 {session_key} 缺少 tokenSignList")
    signs = token_sign_list[1]
    if not isinstance(signs, list) or not signs:
        raise RuntimeError(f"会话 {session_key} 没有可用 token")
    for item in reversed(signs):
        if isinstance(item, dict) and item.get("value"):
            return str(item["value"]).strip()
    raise RuntimeError(f"会话 {session_key} 中未找到 token 值")


def fetch_rows(settings: Settings, args: argparse.Namespace) -> list[dict[str, Any]]:
    where_sql = ["media_type = 'image'", "status = 'ready'"]
    if not args.file_ids:
        where_sql.append("COALESCE(metadata->>'mergedIntoFileId', '') = ''")
    params: list[Any] = []
    if args.file_ids:
        where_sql.append("id = ANY(%s)")
        params.append(args.file_ids)
    else:
        where_sql.append("id > %s")
        params.append(args.start_id)
        if args.end_id > 0:
            where_sql.append("id <= %s")
            params.append(args.end_id)
        if args.updated_before:
            where_sql.append("updated_at < %s")
            params.append(args.updated_before)
    limit_sql = ""
    if args.limit > 0:
        limit_sql = " LIMIT %s"
        params.append(args.limit)

    conn = psycopg.connect(build_dsn(settings), autocommit=True)
    try:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                SELECT id, sha256, size_bytes, mime_type, status, bucket, original_object_key, metadata
                FROM media_file
                WHERE {" AND ".join(where_sql)}
                ORDER BY id
                {limit_sql}
                """,
                params,
            )
            rows = list(cursor.fetchall())
    finally:
        conn.close()
    if args.file_ids:
        existing = {int(row["id"]) for row in rows}
        missing = [file_id for file_id in args.file_ids if file_id not in existing]
        if missing:
            raise RuntimeError(f"以下 file_id 不存在或不是 ready image: {missing}")
    return rows


def download_original(settings: Settings, file_id: int, timeout: int) -> bytes:
    url = build_original_public_url(settings, file_id)
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    data = response.content
    if not data:
        raise RuntimeError(f"file_id={file_id} original 为空")
    return data


def open_first_frame(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    try:
        image.seek(0)
    except EOFError:
        pass
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if has_alpha(image) else "RGB")
    else:
        image = image.copy()
    return image


def resize_to_max_edge(source: Image.Image, max_edge: int) -> Image.Image:
    working = source.copy()
    working.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    return working


def encode_webp(image: Image.Image, quality: float) -> bytes:
    output = io.BytesIO()
    image.save(output, format="WEBP", quality=max(1, min(100, round(quality * 100))), method=6)
    return output.getvalue()


def compress_like_frontend(original_bytes: bytes, max_edge: int, max_bytes: int, label: str) -> bytes:
    source = open_first_frame(original_bytes)
    try:
        current_round_max_edge = max_edge
        # 对齐前端：库内每次按 0.95 降质量/尺寸，离线批处理额外允许更多 0.75 退档轮次。
        for _ in range(IMAGE_OUTER_ROUNDS):
            current_edge = current_round_max_edge
            current_quality = IMAGE_INITIAL_QUALITY
            for inner_round in range(IMAGE_MAX_ITERATION):
                candidate_image = resize_to_max_edge(source, current_edge)
                try:
                    data = encode_webp(candidate_image, current_quality)
                finally:
                    candidate_image.close()
                if len(data) <= max_bytes and len(data) <= len(original_bytes):
                    return data
                if inner_round + 1 >= IMAGE_MAX_ITERATION:
                    break
                current_edge = max(1, round(current_edge * IMAGE_EDGE_SCALE))
                current_quality = max(0.05, current_quality * IMAGE_QUALITY_DECAY)
            next_round_max_edge = max(1, round(current_round_max_edge * IMAGE_ROUND_EDGE_SCALE))
            if next_round_max_edge == current_round_max_edge:
                break
            current_round_max_edge = next_round_max_edge
        raise RuntimeError(f"{label} 图片压缩后仍超过 {max_bytes} bytes")
    finally:
        source.close()


def has_alpha(image: Image.Image) -> bool:
    return image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)


def build_variant(original_bytes: bytes, quality: str) -> bytes:
    profile = VARIANT_PROFILES[quality]
    return compress_like_frontend(original_bytes, int(profile["max_edge"]), int(profile["max_bytes"]), quality)


def rebuild_original_if_needed(original_bytes: bytes) -> bytes:
    if len(original_bytes) <= IMAGE_ORIGINAL_MAX_BYTES:
        return original_bytes
    return compress_like_frontend(original_bytes, 2560, IMAGE_ORIGINAL_MAX_BYTES, QUALITY_ORIGINAL)


def sha256_hex(data: bytes) -> str:
    import hashlib

    return hashlib.sha256(data).hexdigest()


def find_identity_collision(conn: psycopg.Connection, file_id: int, sha256: str, size_bytes: int) -> int | None:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM media_file
            WHERE sha256 = %s
              AND size_bytes = %s
              AND id <> %s
            LIMIT 1
            """,
            (sha256, size_bytes, file_id),
        )
        row = cursor.fetchone()
    return int(row[0]) if row else None


def merge_duplicate_media_references(
    conn: psycopg.Connection,
    duplicate_file_id: int,
    canonical_file_id: int,
) -> int:
    total_replaced = 0
    with conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT message_id, extra
            FROM message
            WHERE extra::text LIKE %s
            ORDER BY message_id
            """,
            (f"%{duplicate_file_id}%",),
        )
        messages = list(cursor.fetchall())

    for message in messages:
        extra = normalize_metadata(message["extra"])
        next_extra, replaced = replace_media_file_id(extra, duplicate_file_id, canonical_file_id)
        if replaced <= 0:
            continue
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE message
                SET extra = %s,
                    update_time = NOW()
                WHERE message_id = %s
                """,
                (Jsonb(next_extra), message["message_id"]),
            )
        total_replaced += replaced

    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE media_file
            SET ref_count = GREATEST(ref_count - %s, 0),
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{mergedIntoFileId}',
                    to_jsonb(%s::bigint),
                    true
                ),
                updated_at = NOW()
            WHERE id = %s
            """,
            (total_replaced, canonical_file_id, duplicate_file_id),
        )
    if total_replaced > 0:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE media_file
                SET ref_count = ref_count + %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (total_replaced, canonical_file_id),
            )
    return total_replaced


def plan_row(settings: Settings, row: dict[str, Any], timeout: int) -> RebuildPlan:
    file_id = int(row["id"])
    original_bytes = download_original(settings, file_id, timeout)
    target_original_bytes = rebuild_original_if_needed(original_bytes)
    target_original_sha256 = sha256_hex(target_original_bytes)
    target_original_size = len(target_original_bytes)
    current_row_sha256 = str(row["sha256"] or "").lower()
    current_row_size = int(row["size_bytes"])
    current_row_mime_type = str(row["mime_type"] or "").lower()
    needs_original_sync = (
        current_row_sha256 != target_original_sha256
        or current_row_size != target_original_size
        or current_row_mime_type != "image/webp"
    )
    target_qualities = next_uploaded_qualities(len(target_original_bytes))
    outputs: dict[str, bytes] = {}
    for quality in target_qualities:
        if quality == QUALITY_ORIGINAL:
            continue
        outputs[quality] = build_variant(target_original_bytes, quality)
    return RebuildPlan(
        file_id=file_id,
        source_original_size=len(original_bytes),
        target_original_size=target_original_size,
        target_original_sha256=target_original_sha256,
        target_original_bytes=target_original_bytes,
        original_changed=target_original_bytes != original_bytes,
        needs_original_sync=needs_original_sync,
        target_qualities=target_qualities,
        outputs=outputs,
    )


def patch_row_for_prepare(
    conn: psycopg.Connection,
    file_id: int,
    metadata: dict[str, Any],
    target_qualities: list[str],
    sha256: str | None = None,
    size_bytes: int | None = None,
    mime_type: str | None = None,
) -> None:
    next_metadata = dict(metadata)
    next_metadata[UPLOADED_QUALITIES_KEY] = target_qualities
    with conn.cursor() as cursor:
        if sha256 is not None and size_bytes is not None:
            cursor.execute(
                """
                UPDATE media_file
                SET sha256 = %s,
                    size_bytes = %s,
                    mime_type = %s,
                    status = 'uploading',
                    metadata = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (sha256, size_bytes, mime_type or "image/webp", Jsonb(next_metadata), file_id),
            )
        else:
            cursor.execute(
                """
                UPDATE media_file
                SET status = 'uploading',
                    metadata = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (Jsonb(next_metadata), file_id),
            )


def restore_row(conn: psycopg.Connection, row: dict[str, Any]) -> None:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            UPDATE media_file
            SET sha256 = %s,
                size_bytes = %s,
                mime_type = %s,
                status = %s,
                metadata = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (
                row["sha256"],
                row["size_bytes"],
                row["mime_type"],
                row["status"],
                Jsonb(normalize_metadata(row["metadata"])),
                row["id"],
            ),
        )


def finalize_row(
    conn: psycopg.Connection,
    file_id: int,
    metadata: dict[str, Any],
    sha256: str | None = None,
    size_bytes: int | None = None,
    mime_type: str | None = None,
) -> None:
    with conn.cursor() as cursor:
        if sha256 is not None and size_bytes is not None:
            cursor.execute(
                """
                UPDATE media_file
                SET sha256 = %s,
                    size_bytes = %s,
                    mime_type = %s,
                    status = 'ready',
                    metadata = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (sha256, size_bytes, mime_type or "image/webp", Jsonb(metadata), file_id),
            )
        else:
            cursor.execute(
                """
                UPDATE media_file
                SET status = 'ready',
                    metadata = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (Jsonb(metadata), file_id),
            )


def prepare_upload(
    settings: Settings,
    auth_token: str,
    row: dict[str, Any],
    metadata: dict[str, Any],
    timeout: int,
) -> dict[str, Any]:
    payload = {
        "fileName": metadata.get("fileName"),
        "scene": metadata.get("scene"),
        "sha256": row["sha256"],
        "sizeBytes": row["size_bytes"],
        "mimeType": row["mime_type"],
        "contentType": row["mime_type"],
        "hasNovelAiMetadata": metadata.get("hasNovelAiMetadata"),
        "metadata": metadata,
    }
    response = requests.post(
        f"{settings.media_api_base_url.rstrip('/')}/media/prepare-upload",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    body = response.json()
    if not body.get("success"):
        raise RuntimeError(f"prepare-upload 失败: {body}")
    data = body.get("data") or {}
    if not data.get("uploadRequired"):
        raise RuntimeError(f"prepare-upload 未返回上传目标: {body}")
    if int(data.get("fileId")) != int(row["id"]):
        raise RuntimeError(f"prepare-upload 返回的 fileId 不匹配: expect={row['id']} actual={data.get('fileId')}")
    return data


def upload_variant(target: dict[str, Any], data: bytes, timeout: int) -> None:
    headers = dict(target.get("uploadHeaders") or {})
    response = requests.put(
        target["uploadUrl"],
        data=data,
        headers=headers,
        timeout=max(timeout, 60),
    )
    response.raise_for_status()


def upload_original(target: dict[str, Any], data: bytes, timeout: int) -> None:
    upload_variant(target, data, timeout)


def complete_upload(settings: Settings, auth_token: str, session_id: int, timeout: int) -> None:
    response = requests.post(
        f"{settings.media_api_base_url.rstrip('/')}/media/upload-sessions/{session_id}/complete",
        headers={"Authorization": f"Bearer {auth_token}"},
        timeout=timeout,
    )
    response.raise_for_status()
    body = response.json()
    if not body.get("success"):
        raise RuntimeError(f"complete-upload 失败: {body}")


def apply_row(
    settings: Settings,
    auth_token: str,
    row: dict[str, Any],
    plan: RebuildPlan,
    timeout: int,
) -> RowResult:
    file_id = int(row["id"])
    metadata = normalize_metadata(row["metadata"])
    target_metadata = dict(metadata)
    target_metadata[UPLOADED_QUALITIES_KEY] = plan.target_qualities
    current_uploaded_qualities = normalize_uploaded_qualities(metadata)

    conn = psycopg.connect(build_dsn(settings), autocommit=True)
    try:
        if not plan.needs_original_sync and not plan.outputs:
            finalize_row(conn, file_id, target_metadata)
            return RowResult(
                file_id=file_id,
                action="metadata-only",
                source_original_size=plan.source_original_size,
                target_original_size=plan.target_original_size,
                target_qualities=plan.target_qualities,
                uploaded_qualities=current_uploaded_qualities,
                notes="未生成任何派生图；已仅回写 uploadedQualities",
            )

        row_for_prepare = dict(row)
        if plan.needs_original_sync:
            collision_file_id = find_identity_collision(conn, file_id, plan.target_original_sha256, plan.target_original_size)
            if collision_file_id is not None:
                merged_refs = merge_duplicate_media_references(conn, file_id, collision_file_id)
                return RowResult(
                    file_id=file_id,
                    action="merged",
                    source_original_size=plan.source_original_size,
                    target_original_size=plan.target_original_size,
                    target_qualities=plan.target_qualities,
                    uploaded_qualities=current_uploaded_qualities,
                    notes=f"已合并到 existing_id={collision_file_id}，迁移引用={merged_refs}",
                )
            patch_row_for_prepare(
                conn,
                file_id,
                metadata,
                plan.target_qualities,
                sha256=plan.target_original_sha256,
                size_bytes=plan.target_original_size,
                mime_type="image/webp",
            )
            row_for_prepare["sha256"] = plan.target_original_sha256
            row_for_prepare["size_bytes"] = plan.target_original_size
            row_for_prepare["mime_type"] = "image/webp"
        else:
            patch_row_for_prepare(conn, file_id, metadata, plan.target_qualities)
        try:
            prepared = prepare_upload(settings, auth_token, row_for_prepare, target_metadata, timeout)
            upload_targets = prepared.get("uploadTargets") or {}
            if plan.needs_original_sync:
                original_target = upload_targets.get(QUALITY_ORIGINAL)
                if not original_target:
                    raise RuntimeError(f"file_id={file_id} prepare-upload 未返回 original 上传目标")
                upload_original(original_target, plan.target_original_bytes, timeout)
            accepted_qualities = list(upload_targets.keys())
            accepted_outputs = {quality: plan.outputs[quality] for quality in accepted_qualities if quality in plan.outputs}
            for quality, target in upload_targets.items():
                if quality == QUALITY_ORIGINAL:
                    continue
                data = accepted_outputs.get(quality)
                if data is None:
                    continue
                upload_variant(target, data, timeout)
            complete_upload(settings, auth_token, int(prepared["sessionId"]), timeout)
            accepted_metadata = dict(metadata)
            accepted_metadata[UPLOADED_QUALITIES_KEY] = accepted_qualities
            finalize_row(
                conn,
                file_id,
                accepted_metadata,
                sha256=plan.target_original_sha256 if plan.needs_original_sync else None,
                size_bytes=plan.target_original_size if plan.needs_original_sync else None,
                mime_type="image/webp" if plan.needs_original_sync else None,
            )
            target_metadata = accepted_metadata
        except Exception:
            restore_row(conn, row)
            raise
    finally:
        conn.close()

    return RowResult(
        file_id=file_id,
        action="uploaded",
        source_original_size=plan.source_original_size,
        target_original_size=plan.target_original_size,
        target_qualities=target_metadata[UPLOADED_QUALITIES_KEY],
        uploaded_qualities=current_uploaded_qualities,
        notes="已重建并上传后端接受的派生图",
    )


def process_row(
    settings: Settings,
    auth_token: str,
    row: dict[str, Any],
    args: argparse.Namespace,
) -> RowResult:
    metadata = normalize_metadata(row["metadata"])
    merged_into = metadata.get("mergedIntoFileId")
    if merged_into is not None:
        current_uploaded_qualities = normalize_uploaded_qualities(metadata)
        return RowResult(
            file_id=int(row["id"]),
            action="merged",
            source_original_size=int(row["size_bytes"]),
            target_original_size=int(row["size_bytes"]),
            target_qualities=current_uploaded_qualities,
            uploaded_qualities=current_uploaded_qualities,
            notes=f"已合并到 existing_id={merged_into}",
        )
    plan = plan_row(settings, row, args.timeout)
    if not args.apply:
        return RowResult(
            file_id=plan.file_id,
            action="dry-run",
            source_original_size=plan.source_original_size,
            target_original_size=plan.target_original_size,
            target_qualities=plan.target_qualities,
            uploaded_qualities=normalize_uploaded_qualities(normalize_metadata(row["metadata"])),
            notes="已生成执行计划，未实际上传",
        )
    return apply_row(settings, auth_token, row, plan, args.timeout)


def main() -> int:
    configure_stdout()
    args = parse_args()
    if args.workers < 1 or args.workers > 16:
        raise SystemExit("--workers 必须是 1 到 16 的整数")
    settings = load_settings()
    auth_token = resolve_auth_token(args, settings)
    rows = fetch_rows(settings, args)
    total = len(rows)
    print(
        "[rebuild-media-image-variants] "
        f"apply={args.apply} rows={total} workers={args.workers} timeout={args.timeout}s"
    )
    print(
        "[rebuild-media-image-variants] "
        f"db={settings.db_host}:{settings.db_port}/{settings.db_name} api={settings.media_api_base_url} public={settings.media_public_base_url}"
    )
    print(
        "[rebuild-media-image-variants] "
        f"auth_user_id={args.auth_user_id if not args.auth_token else 'custom-token'} token_prefix={auth_token[:8]}"
    )

    lock = threading.Lock()
    processed = 0
    failed = 0
    metadata_only = 0
    uploaded = 0
    merged = 0
    dry_run = 0

    def run_one(row: dict[str, Any]) -> RowResult:
        return process_row(settings, auth_token, row, args)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run_one, row): row for row in rows}
        for future in concurrent.futures.as_completed(futures):
            row = futures[future]
            file_id = int(row["id"])
            try:
                result = future.result()
                with lock:
                    processed += 1
                    if result.action == "metadata-only":
                        metadata_only += 1
                    elif result.action == "uploaded":
                        uploaded += 1
                    elif result.action == "merged":
                        merged += 1
                    elif result.action == "dry-run":
                        dry_run += 1
                print(
                    "[done] "
                    f"file_id={file_id} action={result.action} source_original_size={result.source_original_size} "
                    f"target_original_size={result.target_original_size} "
                    f"before={result.uploaded_qualities} after={result.target_qualities} note={result.notes}"
                )
            except Exception as exc:
                with lock:
                    processed += 1
                    failed += 1
                print(f"[failed] file_id={file_id} error={exc}")
            if processed % 50 == 0 or processed == total:
                print(
                    "[progress] "
                    f"{processed}/{total} uploaded={uploaded} merged={merged} metadata_only={metadata_only} dry_run={dry_run} failed={failed}"
                )

    print(
        "[summary] "
        f"total={total} uploaded={uploaded} merged={merged} metadata_only={metadata_only} dry_run={dry_run} failed={failed}"
    )
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
