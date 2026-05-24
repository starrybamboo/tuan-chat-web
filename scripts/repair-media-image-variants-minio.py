#!/usr/bin/env python3
import argparse
import hashlib
import io
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Optional

from minio import Minio
from minio.error import S3Error
from PIL import Image, ImageOps, UnidentifiedImageError


IMAGE_PROFILES = {
    "low": {"max_edge": 200, "max_bytes": 40 * 1024, "quality": 72},
    "medium": {"max_edge": 512, "max_bytes": 150 * 1024, "quality": 76},
}
CACHE_CONTROL = "public, max-age=31536000, immutable"
DEFAULT_PREFIX = "media/v1/files/"


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
    groups = collect_image_groups(client, args.bucket, args.prefix, args.limit)
    print(f"[scan] image groups from object listing: {len(groups)}")
    scanned = 0
    updated = 0

    for group in groups:
        scanned += 1
        result = prefilter_group(group)
        if result["kind"] == "candidate":
            try:
                result = analyze_group(client, args.bucket, group, execute=args.execute)
            except Exception as exc:
                result = {
                    "kind": "failed",
                    "key": group["key"],
                    "error": str(exc),
                }
        merge_stats(stats, result)
        if result["kind"] == "candidate":
            candidates.append(to_report_row(result))
            if args.execute and result.get("executed"):
                updated += 1
                if args.max_updates and updated >= args.max_updates:
                    print(f"[stop] reached max updates: {args.max_updates}")
                    break
        if scanned % args.log_every == 0:
            print_progress(scanned, stats)
        if args.sleep_ms > 0:
            time.sleep(args.sleep_ms / 1000)

    stats["scannedGroups"] = scanned
    candidates.sort(key=lambda item: item.get("estimatedSavingsBytes", 0), reverse=True)
    report = {
        "mode": "execute" if args.execute else "dry-run",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "bucket": args.bucket,
        "prefix": args.prefix,
        "imageProfiles": IMAGE_PROFILES,
        "summary": stats,
        "topCandidates": candidates[: args.sample_limit],
    }
    if args.report:
        with open(args.report, "w", encoding="utf-8") as file:
            json.dump(report, file, ensure_ascii=False, indent=2)
            file.write("\n")
    print_summary(report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repair TuanChat media image low/medium variants in MinIO.")
    parser.add_argument("--endpoint", default=os.getenv("MEDIA_REPAIR_ENDPOINT", "127.0.0.1:9000"))
    parser.add_argument("--access-key", default=os.getenv("MEDIA_REPAIR_ACCESS_KEY"))
    parser.add_argument("--secret-key", default=os.getenv("MEDIA_REPAIR_SECRET_KEY"))
    parser.add_argument("--bucket", default=os.getenv("MEDIA_REPAIR_BUCKET", "avatar"))
    parser.add_argument("--prefix", default=os.getenv("MEDIA_REPAIR_PREFIX", DEFAULT_PREFIX))
    parser.add_argument("--secure", action="store_true", default=os.getenv("MEDIA_REPAIR_SECURE", "false").lower() == "true")
    parser.add_argument("--execute", action="store_true", help="write repaired low/medium variants")
    parser.add_argument("--limit", type=int, default=0, help="max original groups to scan")
    parser.add_argument("--max-updates", type=int, default=0, help="max candidate groups to update in execute mode")
    parser.add_argument("--sample-limit", type=int, default=50)
    parser.add_argument("--log-every", type=int, default=200)
    parser.add_argument("--sleep-ms", type=int, default=0)
    parser.add_argument("--report")
    args = parser.parse_args()
    if not args.access_key or not args.secret_key:
        raise SystemExit("missing --access-key/--secret-key or MEDIA_REPAIR_ACCESS_KEY/MEDIA_REPAIR_SECRET_KEY")
    if args.limit < 0 or args.max_updates < 0 or args.sample_limit <= 0 or args.log_every <= 0 or args.sleep_ms < 0:
        raise SystemExit("numeric limits must be non-negative, and sample-limit/log-every must be positive")
    args.prefix = normalize_prefix(args.prefix)
    return args


def collect_image_groups(client: Minio, bucket: str, prefix: str, limit: int) -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}
    for item in client.list_objects(bucket, prefix=prefix, recursive=True):
        object_name = item.object_name
        if not object_name:
            continue
        if object_name.endswith("/original"):
            root = object_name[: -len("/original")]
            group = groups.setdefault(root, {"key": root})
            group["original"] = object_name
            group["originalSize"] = item.size
        elif object_name.endswith("/image/low.webp"):
            root = object_name[: -len("/image/low.webp")]
            group = groups.setdefault(root, {"key": root})
            group["low"] = object_name
            group["lowSize"] = item.size
        elif object_name.endswith("/image/medium.webp"):
            root = object_name[: -len("/image/medium.webp")]
            group = groups.setdefault(root, {"key": root})
            group["medium"] = object_name
            group["mediumSize"] = item.size

    image_groups: list[dict[str, Any]] = []
    for root in sorted(groups):
        group = groups[root]
        if "original" not in group:
            continue
        group.setdefault("low", f"{root}/image/low.webp")
        group.setdefault("medium", f"{root}/image/medium.webp")
        image_groups.append(group)
        if limit and len(image_groups) >= limit:
            break
    return image_groups


def prefilter_group(group: dict[str, Any]) -> dict[str, Any]:
    reasons = {
        "low": prefilter_variant_reasons(group, "low", IMAGE_PROFILES["low"]),
        "medium": prefilter_variant_reasons(group, "medium", IMAGE_PROFILES["medium"]),
    }
    repaired_qualities = [quality for quality, values in reasons.items() if values]
    if not repaired_qualities:
        return {"kind": "healthy", "key": group["key"]}
    return {
        "kind": "candidate",
        "key": group["key"],
        "repairedQualities": repaired_qualities,
        "lowReasons": reasons["low"],
        "mediumReasons": reasons["medium"],
    }


def prefilter_variant_reasons(group: dict[str, Any], quality: str, profile: dict[str, int]) -> list[str]:
    size = group.get(f"{quality}Size")
    original_size = group.get("originalSize")
    if size is None:
        return ["missing"]
    reasons: list[str] = []
    if size > profile["max_bytes"]:
        reasons.append("tooLarge")
    # 旧回填曾把 original 原样复制为派生图；同体积对象先进入精查，再用哈希确认。
    if original_size is not None and size == original_size:
        reasons.append("sameSizeAsOriginal")
    return reasons


def analyze_group(client: Minio, bucket: str, group: dict[str, str], execute: bool) -> dict[str, Any]:
    original = get_object_bytes(client, bucket, group["original"])
    original_hash = sha256(original)
    original_meta = image_metadata(original)
    if not original_meta["supported"]:
        return {
            "kind": "unsupportedOriginal",
            "key": group["key"],
            "format": original_meta["format"],
        }

    variants = {
        quality: inspect_variant(client, bucket, group[quality], original_hash, IMAGE_PROFILES[quality])
        for quality in ("low", "medium")
    }
    repair_qualities = [quality for quality, variant in variants.items() if variant["needsRepair"]]
    if not repair_qualities:
        return {"kind": "healthy", "key": group["key"]}

    outputs = {
        quality: build_variant(original, IMAGE_PROFILES[quality]) if quality in repair_qualities else None
        for quality in ("low", "medium")
    }
    if execute:
        for quality in repair_qualities:
            write_variant(client, bucket, group[quality], outputs[quality]["bytes"])

    current_low = variants["low"]["bytes"] or 0
    current_medium = variants["medium"]["bytes"] or 0
    estimated_low = len(outputs["low"]["bytes"]) if outputs["low"] else current_low
    estimated_medium = len(outputs["medium"]["bytes"]) if outputs["medium"] else current_medium
    current_variant_bytes = current_low + current_medium
    estimated_variant_bytes = estimated_low + estimated_medium
    return {
        "kind": "candidate",
        "key": group["key"],
        "executed": execute,
        "repairedQualities": repair_qualities,
        "originalBytes": len(original),
        "originalWidth": original_meta["width"],
        "originalHeight": original_meta["height"],
        "format": original_meta["format"],
        "currentLowBytes": variants["low"]["bytes"],
        "currentMediumBytes": variants["medium"]["bytes"],
        "estimatedLowBytes": estimated_low,
        "estimatedMediumBytes": estimated_medium,
        "currentVariantBytes": current_variant_bytes,
        "estimatedVariantBytes": estimated_variant_bytes,
        "estimatedSavingsBytes": current_variant_bytes - estimated_variant_bytes,
        "lowReasons": variants["low"]["reasons"],
        "mediumReasons": variants["medium"]["reasons"],
    }


def inspect_variant(client: Minio, bucket: str, object_name: str, original_hash: str, profile: dict[str, int]) -> dict[str, Any]:
    reasons: list[str] = []
    try:
        stat = client.stat_object(bucket, object_name)
    except S3Error as exc:
        if exc.code in ("NoSuchKey", "NoSuchObject"):
            return {"bytes": None, "reasons": ["missing"], "needsRepair": True}
        raise

    if stat.size is not None and stat.size > profile["max_bytes"]:
        reasons.append("tooLarge")
    if stat.content_type and stat.content_type.lower() != "image/webp":
        reasons.append("invalidContentType")

    same_as_original = False
    try:
        body = get_object_bytes(client, bucket, object_name)
        same_as_original = sha256(body) == original_hash
        meta = image_metadata(body)
        if not meta["supported"] or meta["format"] != "WEBP":
            reasons.append("invalidFormat")
        if max(meta["width"] or 0, meta["height"] or 0) > profile["max_edge"]:
            reasons.append("tooLargeDimension")
    except Exception:
        reasons.append("unreadable")

    # 完全相同的小 WebP 仍可能已经满足当前 low/medium 标准，不应误报。
    if same_as_original and reasons:
        reasons.append("sameAsOriginal")

    return {
        "bytes": stat.size,
        "reasons": sorted(set(reasons)),
        "needsRepair": bool(reasons),
    }


def build_variant(original: bytes, profile: dict[str, int]) -> dict[str, Any]:
    best: Optional[dict[str, Any]] = None
    qualities = [
        profile["quality"],
        max(10, round(profile["quality"] * 0.85)),
        max(10, round(profile["quality"] * 0.70)),
        max(10, round(profile["quality"] * 0.55)),
        max(10, round(profile["quality"] * 0.40)),
    ]
    source = open_first_frame(original)
    source.thumbnail((profile["max_edge"], profile["max_edge"]), Image.Resampling.LANCZOS)
    for quality in qualities:
        output = io.BytesIO()
        source.save(output, format="WEBP", quality=quality, method=4)
        data = output.getvalue()
        if best is None or len(data) < len(best["bytes"]):
            best = {"bytes": data, "quality": quality}
        if len(data) <= profile["max_bytes"]:
            return {"bytes": data, "quality": quality}
    return best


def write_variant(client: Minio, bucket: str, object_name: str, data: bytes) -> None:
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


def normalize_prefix(prefix: str) -> str:
    return prefix.strip().strip("/") + "/"


def new_stats(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "mode": "execute" if args.execute else "dry-run",
        "scannedGroups": 0,
        "healthyGroups": 0,
        "unsupportedOriginalGroups": 0,
        "failedGroups": 0,
        "candidateGroups": 0,
        "updatedGroups": 0,
        "missingVariants": 0,
        "oversizedVariants": 0,
        "oversizeDimensionVariants": 0,
        "duplicateOriginalVariants": 0,
        "invalidFormatVariants": 0,
        "invalidContentTypeVariants": 0,
        "unreadableVariants": 0,
        "repairedLowGroups": 0,
        "repairedMediumGroups": 0,
        "currentVariantBytes": 0,
        "estimatedVariantBytes": 0,
        "estimatedSavingsBytes": 0,
    }


def merge_stats(stats: dict[str, Any], result: dict[str, Any]) -> None:
    kind = result["kind"]
    if kind == "healthy":
        stats["healthyGroups"] += 1
        return
    if kind == "unsupportedOriginal":
        stats["unsupportedOriginalGroups"] += 1
        return
    if kind == "failed":
        stats["failedGroups"] += 1
        return
    if kind != "candidate":
        return

    stats["candidateGroups"] += 1
    if result.get("executed"):
        stats["updatedGroups"] += 1
    qualities = result.get("repairedQualities", [])
    if "low" in qualities:
        stats["repairedLowGroups"] += 1
    if "medium" in qualities:
        stats["repairedMediumGroups"] += 1
    reasons = result.get("lowReasons", []) + result.get("mediumReasons", [])
    stats["missingVariants"] += reasons.count("missing")
    stats["oversizedVariants"] += reasons.count("tooLarge")
    stats["oversizeDimensionVariants"] += reasons.count("tooLargeDimension")
    stats["duplicateOriginalVariants"] += reasons.count("sameAsOriginal")
    stats["invalidFormatVariants"] += reasons.count("invalidFormat")
    stats["invalidContentTypeVariants"] += reasons.count("invalidContentType")
    stats["unreadableVariants"] += reasons.count("unreadable")
    stats["currentVariantBytes"] += result.get("currentVariantBytes", 0)
    stats["estimatedVariantBytes"] += result.get("estimatedVariantBytes", 0)
    stats["estimatedSavingsBytes"] += result.get("estimatedSavingsBytes", 0)


def to_report_row(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": result["key"],
        "repairedQualities": result["repairedQualities"],
        "format": result["format"],
        "originalBytes": result["originalBytes"],
        "originalWidth": result["originalWidth"],
        "originalHeight": result["originalHeight"],
        "currentLowBytes": result["currentLowBytes"],
        "currentMediumBytes": result["currentMediumBytes"],
        "estimatedLowBytes": result["estimatedLowBytes"],
        "estimatedMediumBytes": result["estimatedMediumBytes"],
        "estimatedSavingsBytes": result["estimatedSavingsBytes"],
        "lowReasons": result["lowReasons"],
        "mediumReasons": result["mediumReasons"],
    }


def print_progress(scanned: int, stats: dict[str, Any]) -> None:
    print(
        "[progress] "
        f"scanned={scanned} candidates={stats['candidateGroups']} "
        f"updated={stats['updatedGroups']} failed={stats['failedGroups']} "
        f"delta={stats['estimatedSavingsBytes']}"
    )


def print_summary(report: dict[str, Any]) -> None:
    summary = report["summary"]
    print("=== Media Image Variant Repair Summary ===")
    for key in (
        "mode",
        "scannedGroups",
        "healthyGroups",
        "unsupportedOriginalGroups",
        "failedGroups",
        "candidateGroups",
        "updatedGroups",
        "repairedLowGroups",
        "repairedMediumGroups",
        "missingVariants",
        "oversizedVariants",
        "oversizeDimensionVariants",
        "duplicateOriginalVariants",
        "invalidFormatVariants",
        "invalidContentTypeVariants",
        "unreadableVariants",
        "currentVariantBytes",
        "estimatedVariantBytes",
        "estimatedSavingsBytes",
    ):
        print(f"{key}: {summary.get(key)}")
    if report.get("topCandidates"):
        print("topCandidates:")
        for row in report["topCandidates"][:5]:
            print(f"- {row['key']} {row['repairedQualities']} low={row['lowReasons']} medium={row['mediumReasons']}")


if __name__ == "__main__":
    main()
