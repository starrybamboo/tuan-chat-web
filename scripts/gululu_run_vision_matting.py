#!/usr/bin/env python3

import argparse
import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


DEFAULT_ROOT = Path(r"D:\gululu-cache\output\opus-88-owner-only-refetch-v3")


def parse_args():
    parser = argparse.ArgumentParser(description="Run rembg for Gululu vision-gated matting candidates.")
    parser.add_argument("--root", default=str(DEFAULT_ROOT))
    parser.add_argument("--review-dir", default="")
    parser.add_argument("--model", default="isnet-anime")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    return parser.parse_args()


def truthy(value):
    return str(value or "").lower() in {"1", "true", "yes", "y", "是"}


def normalize_rel(value):
    return str(value or "").replace("\\", "/")


def safe_stem(source_rel_path):
    stem = Path(normalize_rel(source_rel_path)).stem or "image"
    for char in '<>:"/\\|?*':
        stem = stem.replace(char, "_")
    return stem[:80]


def read_csv(path):
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def source_abs(root, source_rel_path):
    return root / "images" / Path(normalize_rel(source_rel_path))


def output_paths(review_dir, row):
    stem = safe_stem(row["sourceRelPath"])
    sha = (row.get("sha256") or "nohash")[:12]
    name = f"{stem}__{sha}.png"
    transparent_rel = Path("processed") / "transparent" / name
    mask_rel = Path("processed") / "alpha-mask" / name
    return transparent_rel, mask_rel


def run_one(session, root, review_dir, row, force):
    transparent_rel, mask_rel = output_paths(review_dir, row)
    transparent_abs = review_dir / transparent_rel
    mask_abs = review_dir / mask_rel
    input_abs = source_abs(root, row["sourceRelPath"])
    result = {
        "sourceRelPath": normalize_rel(row["sourceRelPath"]),
        "sha256": row.get("sha256", ""),
        "mattingModel": "rembg:isnet-anime",
        "transparentRelPath": normalize_rel(transparent_rel),
        "alphaMaskRelPath": normalize_rel(mask_rel),
        "status": "pending",
        "error": "",
    }
    try:
        if transparent_abs.exists() and mask_abs.exists() and not force:
            result["status"] = "cached"
            return result
        data = input_abs.read_bytes()
        output = remove(data, session=session)
        image = Image.open(io.BytesIO(output)).convert("RGBA")
        transparent_abs.parent.mkdir(parents=True, exist_ok=True)
        mask_abs.parent.mkdir(parents=True, exist_ok=True)
        image.save(transparent_abs)
        image.getchannel("A").save(mask_abs)
        result["status"] = "processed"
    except Exception as exc:  # noqa: BLE001 - record per-image failures and continue.
        result["status"] = "error"
        result["error"] = str(exc)
    return result


def main():
    args = parse_args()
    root = Path(args.root).resolve()
    review_dir = Path(args.review_dir or root / "cleaning-review-ai-first-v1").resolve()
    decisions_path = review_dir / "matting-decisions.vision.csv"
    rows = [
        row
        for row in read_csv(decisions_path)
        if truthy(row.get("mattingAllowed")) and truthy(row.get("needsMatting"))
    ]
    if args.limit > 0:
        rows = rows[: args.limit]

    session = new_session(args.model)
    results = []
    for index, row in enumerate(rows, start=1):
        print(f"matting {index}/{len(rows)} {row['sourceRelPath']}", flush=True)
        results.append(run_one(session, root, review_dir, row, args.force))

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": f"rembg:{args.model}",
        "reviewDir": str(review_dir),
        "results": results,
        "summary": {
            "cached": sum(1 for row in results if row["status"] == "cached"),
            "errors": sum(1 for row in results if row["status"] == "error"),
            "processed": sum(1 for row in results if row["status"] == "processed"),
            "total": len(results),
        },
    }
    (review_dir / "matting-results.vision.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(output["summary"], ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
