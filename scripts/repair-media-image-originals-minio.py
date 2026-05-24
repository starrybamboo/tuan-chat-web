#!/usr/bin/env python3
import argparse
import hashlib
import io
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional

from minio import Minio
from PIL import Image, ImageOps, UnidentifiedImageError


ORIGINAL_PROFILE = {
    "max_bytes": 3 * 1024 * 1024,
    "quality": 82,
}
QUALITY_STEPS = (88, 82, 76, 68, 60, 52, 44, 36)
SCALE_STEPS = (1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3)
CACHE_CONTROL = "public, max-age=31536000, immutable"
DEFAULT_PREFIX = "media/v1/files/"
ORIGINAL_KEY_RE = re.compile(r"/(?P<file_id>\d+)/original$")


def main() -> None:
    args = parse_args()
    client = Minio(
        endpoint=args.endpoint,
        access_key=args.access_key,
        secret_key=args.secret_key,
        secure=args.secure,
    )

    stats = new_stats(args)
    candidates: list[dict[str, Any]] = []
    updates: list[dict[str, Any]] = []
    groups = collect_originals(client, args.bucket, args.prefix, args.limit)
    print(f"[scan] original objects from listing: {len(groups)}")

    updated = 0
    for index, group in enumerate(groups, start=1):
        try:
            result = analyze_original(client, args.bucket, group, execute=args.execute)
        except Exception as exc:
            result = {
                "kind": "failed",
                "key": group["objectName"],
                "fileId": group.get("fileId"),
                "error": str(exc),
            }

        merge_stats(stats, result)
        if result["kind"] == "candidate":
            row = to_report_row(result)
            candidates.append(row)
            updates.append(row)
            if args.execute and result.get("executed"):
                updated += 1
                if args.max_updates and updated >= args.max_updates:
                    print(f"[stop] reached max updates: {args.max_updates}")
                    break
        elif result["kind"] == "failed" and len(stats["failedSamples"]) < args.sample_limit:
            stats["failedSamples"].append(result)

        if index % args.log_every == 0 or index == len(groups):
            print_progress(index, stats)
        if args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000)

    stats["scannedObjects"] = index if groups else 0
    candidates.sort(key=lambda item: item.get("beforeBytes", 0), reverse=True)
    report = {
        "mode": "execute" if args.execute else "dry-run",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "bucket": args.bucket,
        "prefix": args.prefix,
        "originalProfile": ORIGINAL_PROFILE,
        "summary": stats,
        "topCandidates": candidates[: args.sample_limit],
        "updatedFiles": updates,
    }
    if args.report:
        with open(args.report, "w", encoding="utf-8") as file:
            json.dump(report, file, ensure_ascii=False, indent=2)
            file.write("\n")
    if args.sql:
        with open(args.sql, "w", encoding="utf-8") as file:
            file.write(build_sql(updates, args.execute))
    print_summary(report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize TuanChat image original objects to WebP in MinIO.")
    parser.add_argument("--endpoint", default=os.getenv("MEDIA_REPAIR_ENDPOINT", "127.0.0.1:9000"))
    parser.add_argument("--access-key", default=os.getenv("MEDIA_REPAIR_ACCESS_KEY"))
    parser.add_argument("--secret-key", default=os.getenv("MEDIA_REPAIR_SECRET_KEY"))
    parser.add_argument("--bucket", default=os.getenv("MEDIA_REPAIR_BUCKET", "avatar"))
    parser.add_argument("--prefix", default=os.getenv("MEDIA_REPAIR_PREFIX", DEFAULT_PREFIX))
    parser.add_argument("--secure", action="store_true", default=os.getenv("MEDIA_REPAIR_SECURE", "false").lower() == "true")
    parser.add_argument("--execute", action="store_true", help="write normalized original objects")
    parser.add_argument("--limit", type=int, default=0, help="max original objects to scan")
    parser.add_argument("--max-updates", type=int, default=0, help="max candidate objects to update in execute mode")
    parser.add_argument("--sample-limit", type=int, default=50)
    parser.add_argument("--log-every", type=int, default=200)
    parser.add_argument("--sleep-ms", type=int, default=0)
    parser.add_argument("--report")
    parser.add_argument("--sql")
    args = parser.parse_args()
    if not args.access_key or not args.secret_key:
        raise SystemExit("missing --access-key/--secret-key or MEDIA_REPAIR_ACCESS_KEY/MEDIA_REPAIR_SECRET_KEY")
    if args.limit < 0 or args.max_updates < 0 or args.sample_limit <= 0 or args.log_every <= 0 or args.sleep_ms < 0:
        raise SystemExit("numeric limits must be non-negative, and sample-limit/log-every must be positive")
    args.prefix = normalize_prefix(args.prefix)
    return args


def collect_originals(client: Minio, bucket: str, prefix: str, limit: int) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for item in client.list_objects(bucket, prefix=prefix, recursive=True):
        object_name = item.object_name
        if not object_name or not object_name.endswith("/original"):
            continue
        match = ORIGINAL_KEY_RE.search(object_name)
        file_id = int(match.group("file_id")) if match else None
        groups.append({
            "objectName": object_name,
            "fileId": file_id,
            "listedSize": item.size,
        })
        if limit and len(groups) >= limit:
            break
    return groups


def analyze_original(client: Minio, bucket: str, group: dict[str, Any], execute: bool) -> dict[str, Any]:
    object_name = group["objectName"]
    stat = client.stat_object(bucket, object_name)
    original = get_object_bytes(client, bucket, object_name)
    original_meta = image_metadata(original)
    if not original_meta["supported"]:
        return {
            "kind": "unsupportedOriginal",
            "key": object_name,
            "fileId": group.get("fileId"),
            "bytes": len(original),
            "format": original_meta["format"],
        }

    content_type = (stat.content_type or "").lower()
    needs_repair = (
        original_meta["format"] != "WEBP"
        or len(original) > ORIGINAL_PROFILE["max_bytes"]
        or content_type != "image/webp"
    )
    if not needs_repair:
        return {"kind": "healthy", "key": object_name, "fileId": group.get("fileId")}

    output = build_original(original, ORIGINAL_PROFILE)
    if len(output["bytes"]) > ORIGINAL_PROFILE["max_bytes"]:
        raise RuntimeError(f"无法压缩到 {ORIGINAL_PROFILE['max_bytes']} bytes 以内，最优结果 {len(output['bytes'])} bytes")

    if execute:
        write_original(client, bucket, object_name, output["bytes"])

    return {
        "kind": "candidate",
        "key": object_name,
        "fileId": group.get("fileId"),
        "executed": execute,
        "format": original_meta["format"],
        "contentType": content_type,
        "originalWidth": original_meta["width"],
        "originalHeight": original_meta["height"],
        "beforeBytes": len(original),
        "afterBytes": len(output["bytes"]),
        "sha256": sha256(output["bytes"]),
        "strategy": output["strategy"],
    }


def build_original(original: bytes, profile: dict[str, int]) -> dict[str, Any]:
    source = open_first_frame(original)
    best: Optional[dict[str, Any]] = None
    for scale in SCALE_STEPS:
        resized = resize_copy(source, scale)
        for quality in QUALITY_STEPS:
            output = io.BytesIO()
            resized.save(output, format="WEBP", quality=quality, method=4)
            data = output.getvalue()
            strategy = {
                "format": "WEBP",
                "scale": scale,
                "quality": quality,
                "width": resized.width,
                "height": resized.height,
            }
            if best is None or len(data) < len(best["bytes"]):
                best = {"bytes": data, "strategy": strategy}
            if len(data) <= profile["max_bytes"]:
                return {"bytes": data, "strategy": strategy}
    return best


def resize_copy(source: Image.Image, scale: float) -> Image.Image:
    width = max(1, round(source.width * scale))
    height = max(1, round(source.height * scale))
    if width == source.width and height == source.height:
        return source.copy()
    return source.resize((width, height), Image.Resampling.LANCZOS)


def write_original(client: Minio, bucket: str, object_name: str, data: bytes) -> None:
    client.put_object(
        bucket,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type="image/webp",
        metadata={"Cache-Control": CACHE_CONTROL},
        num_parallel_uploads=1,
    )


def get_object_bytes(client: Minio, bucket: str, object_name: str) -> bytes:
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def image_metadata(data: bytes) -> dict[str, Any]:
    try:
        with Image.open(io.BytesIO(data)) as image:
            return {
                "supported": True,
                "format": image.format,
                "width": image.width,
                "height": image.height,
            }
    except (UnidentifiedImageError, OSError):
        return {"supported": False, "format": None, "width": None, "height": None}


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


def has_alpha(image: Image.Image) -> bool:
    return image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_sql(updates: list[dict[str, Any]], execute: bool) -> str:
    lines = [
        "-- media_file original WebP normalization",
        f"-- mode: {'execute' if execute else 'dry-run'}",
        f"-- generatedAt: {datetime.now(timezone.utc).isoformat()}",
        "BEGIN;",
    ]
    for item in updates:
        file_id = item.get("fileId")
        if not file_id:
            continue
        lines.append(
            "UPDATE tuanchat.media_file "
            f"SET size_bytes = {item['afterBytes']}, sha256 = '{item['sha256']}', "
            "mime_type = 'image/webp', updated_at = NOW() "
            f"WHERE id = {file_id};"
        )
    lines.extend(["COMMIT;", ""])
    return "\n".join(lines)


def new_stats(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "mode": "execute" if args.execute else "dry-run",
        "scannedObjects": 0,
        "healthyObjects": 0,
        "unsupportedOriginalObjects": 0,
        "failedObjects": 0,
        "candidateObjects": 0,
        "updatedObjects": 0,
        "beforeBytes": 0,
        "afterBytes": 0,
        "deltaBytes": 0,
        "failedSamples": [],
    }


def merge_stats(stats: dict[str, Any], result: dict[str, Any]) -> None:
    kind = result["kind"]
    if kind == "healthy":
        stats["healthyObjects"] += 1
        return
    if kind == "unsupportedOriginal":
        stats["unsupportedOriginalObjects"] += 1
        return
    if kind == "failed":
        stats["failedObjects"] += 1
        return
    if kind != "candidate":
        return

    stats["candidateObjects"] += 1
    if result.get("executed"):
        stats["updatedObjects"] += 1
    stats["beforeBytes"] += result["beforeBytes"]
    stats["afterBytes"] += result["afterBytes"]
    stats["deltaBytes"] += result["afterBytes"] - result["beforeBytes"]


def to_report_row(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": result["key"],
        "fileId": result.get("fileId"),
        "format": result["format"],
        "contentType": result["contentType"],
        "originalWidth": result["originalWidth"],
        "originalHeight": result["originalHeight"],
        "beforeBytes": result["beforeBytes"],
        "afterBytes": result["afterBytes"],
        "deltaBytes": result["afterBytes"] - result["beforeBytes"],
        "sha256": result["sha256"],
        "strategy": result["strategy"],
        "executed": result["executed"],
    }


def print_progress(scanned: int, stats: dict[str, Any]) -> None:
    print(
        "[progress] "
        f"scanned={scanned} candidates={stats['candidateObjects']} "
        f"updated={stats['updatedObjects']} failed={stats['failedObjects']} "
        f"delta={stats['deltaBytes']}"
    )


def print_summary(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=== Media Image Original Repair Summary ===")
    for key in (
        "mode",
        "scannedObjects",
        "healthyObjects",
        "unsupportedOriginalObjects",
        "failedObjects",
        "candidateObjects",
        "updatedObjects",
        "beforeBytes",
        "afterBytes",
        "deltaBytes",
    ):
        print(f"{key}: {summary[key]}")
    if report.get("topCandidates"):
        print("topCandidates:")
        for item in report["topCandidates"][:5]:
            print(f"- {item['key']} {item['format']} {item['beforeBytes']} -> {item['afterBytes']}")


def normalize_prefix(prefix: str) -> str:
    return prefix.strip().strip("/") + "/"


if __name__ == "__main__":
    main()
