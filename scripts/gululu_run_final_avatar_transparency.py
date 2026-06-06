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
DEFAULT_AVATAR_KINDS = {"character-avatar-bust", "character-avatar-chat"}


def parse_args():
    parser = argparse.ArgumentParser(description="Make final non-manga Gululu avatar assets transparent in place.")
    parser.add_argument("--root", default=str(DEFAULT_ROOT))
    parser.add_argument("--final-dir", default="")
    parser.add_argument("--model", default="isnet-anime")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--include-manga-avatar", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    return parser.parse_args()


def normalize_rel(value):
    return str(value or "").replace("\\", "/")


def source_abs(root, source_rel_path):
    return root / "images" / Path(normalize_rel(source_rel_path))


def read_rows(path):
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader), list(reader.fieldnames or [])


def write_rows(path, rows, fieldnames):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def alpha_stats(path):
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    hist = alpha.histogram()
    total = sum(hist)
    return {
        "opaqueRatio": round(sum(hist[248:]) / total, 6),
        "transparentRatio": round(sum(hist[:8]) / total, 6),
    }


def avatar_output_rel(row):
    output_rel = Path(normalize_rel(row["outputRelPath"]))
    if output_rel.suffix.lower() == ".png":
        return output_rel
    return output_rel.with_suffix(".png")


def mask_rel_for(output_rel):
    return Path("reports") / "avatar-alpha-mask" / output_rel


def make_transparent(session, source_path):
    return Image.open(io.BytesIO(remove(source_path.read_bytes(), session=session))).convert("RGBA")


def process_row(session, root, final_dir, row, force):
    old_output_rel = Path(normalize_rel(row["outputRelPath"]))
    output_rel = avatar_output_rel(row)
    output_abs = final_dir / output_rel
    old_output_abs = final_dir / old_output_rel
    mask_rel = mask_rel_for(output_rel)
    mask_abs = final_dir / mask_rel
    result = {
        "assetKind": row.get("assetKind", ""),
        "error": "",
        "outputRelPath": normalize_rel(output_rel),
        "sourceRelPath": normalize_rel(row.get("sourceRelPath", "")),
        "status": "pending",
    }
    try:
        if output_abs.exists() and not force:
            stats = alpha_stats(output_abs)
            if stats["transparentRatio"] > 0:
                result.update(stats)
                result["status"] = "cached"
                row["outputRelPath"] = normalize_rel(output_rel)
                row["materializedAs"] = "avatar-transparent"
                row["transparentRelPath"] = normalize_rel(output_rel)
                row["alphaMaskRelPath"] = normalize_rel(mask_rel) if mask_abs.exists() else ""
                return result

        image = make_transparent(session, source_abs(root, row["sourceRelPath"]))
        output_abs.parent.mkdir(parents=True, exist_ok=True)
        mask_abs.parent.mkdir(parents=True, exist_ok=True)
        image.save(output_abs)
        image.getchannel("A").save(mask_abs)
        if old_output_abs != output_abs and old_output_abs.exists():
            old_output_abs.unlink()
        stats = alpha_stats(output_abs)
        result.update(stats)
        result["status"] = "processed"
        row["outputRelPath"] = normalize_rel(output_rel)
        row["materializedAs"] = "avatar-transparent"
        row["transparentRelPath"] = normalize_rel(output_rel)
        row["alphaMaskRelPath"] = normalize_rel(mask_rel)
    except Exception as exc:  # noqa: BLE001 - record per-avatar failures and continue.
        result["status"] = "error"
        result["error"] = str(exc)
    return result


def main():
    args = parse_args()
    root = Path(args.root).resolve()
    final_dir = Path(args.final_dir or root / "image-role-review-clean-vision-final").resolve()
    index_path = final_dir / "index.csv"
    rows, fieldnames = read_rows(index_path)
    for field in ["transparentRelPath", "alphaMaskRelPath"]:
        if field not in fieldnames:
            fieldnames.append(field)
            for row in rows:
                row[field] = row.get(field, "")

    avatar_kinds = set(DEFAULT_AVATAR_KINDS)
    if args.include_manga_avatar:
        avatar_kinds.add("manga-avatar")
    avatar_rows = [row for row in rows if row.get("assetKind") in avatar_kinds]
    if args.limit > 0:
        avatar_rows = avatar_rows[: args.limit]

    session = new_session(args.model)
    results = []
    for index, row in enumerate(avatar_rows, start=1):
        print(f"avatar {index}/{len(avatar_rows)} {row['sourceRelPath']}", flush=True)
        results.append(process_row(session, root, final_dir, row, args.force))

    write_rows(index_path, rows, fieldnames)
    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": f"rembg:{args.model}",
        "results": results,
        "summary": {
            "cached": sum(1 for row in results if row["status"] == "cached"),
            "errors": sum(1 for row in results if row["status"] == "error"),
            "includeMangaAvatar": args.include_manga_avatar,
            "processed": sum(1 for row in results if row["status"] == "processed"),
            "skippedMangaAvatar": 0 if args.include_manga_avatar else sum(1 for row in rows if row.get("assetKind") == "manga-avatar"),
            "total": len(results),
        },
    }
    (final_dir / "reports").mkdir(parents=True, exist_ok=True)
    (final_dir / "reports" / "avatar-transparency-results.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(output["summary"], ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
