"""Detect and remove duplicate / near-duplicate images from the mammography
dataset so the train/val/test split cannot leak.

Strategy (performed within each class to avoid merging different lesions):
  1. Exact dedup by MD5 of file bytes (byte-identical copies -> keep 1).
  2. Perceptual dedup with pHash (64-bit). Near-duplicates are found with
     LSH banding (8 bands x 8 bits, which guarantees recall for Hamming
     distance <= 7) and clustered with union-find. Mirror-aware: an image
     and its horizontal flip are treated as the same, so augmented/flipped
     copies are caught.
  3. Keep one representative per duplicate cluster.

Outputs:
  data/unique_manifest.json   list of kept (path, class) for training
  data/dedup_report.json      counts of what was removed

Usage:
    python scripts/dedupe_dataset.py --threshold 5
"""

import argparse
import hashlib
import json
from collections import defaultdict
from multiprocessing import Pool
from pathlib import Path

import imagehash
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
DATA_DIR = REPO / "data" / "raw" / "CLAHE_images"
OUT_MANIFEST = REPO / "data" / "unique_manifest.json"
OUT_REPORT = REPO / "data" / "dedup_report.json"
CLASSES = ["benign", "malignant", "normal"]

# LSH banding: 8 bands of 8 bits. Two 64-bit hashes with Hamming distance
# <= 7 must agree on at least one band, so recall is guaranteed for small T.
BANDS = 8
BAND_BITS = 8
BAND_MASK = (1 << BAND_BITS) - 1


def list_files():
    files = []
    for ci, cn in enumerate(CLASSES):
        d = DATA_DIR / cn
        if not d.is_dir():
            continue
        for p in sorted(d.iterdir()):
            if p.suffix.lower() == ".png":
                files.append((str(p), ci, cn, p.name))
    return files


def _hash_one(args):
    path, ci, cn, name = args
    with open(path, "rb") as fh:
        md5 = hashlib.md5(fh.read()).hexdigest()
    img = Image.open(path).convert("L")
    h = imagehash.phash(img, hash_size=8).hash.flatten()
    mh = imagehash.phash(
        img.transpose(Image.FLIP_LEFT_RIGHT), hash_size=8
    ).hash.flatten()
    h_int = int(np.packbits(h).tobytes().hex(), 16)
    mh_int = int(np.packbits(mh).tobytes().hex(), 16)
    return {
        "path": path, "ci": ci, "cn": cn, "name": name,
        "md5": md5, "h": h_int, "mh": mh_int,
    }


def hamming(a, b):
    return bin(a ^ b).count("1")


def union_find_merge(parent, a, b):
    ra, rb = a, b
    while parent[ra] != ra:
        parent[ra] = parent[parent[ra]]
        ra = parent[ra]
    while parent[rb] != rb:
        parent[rb] = parent[parent[rb]]
        rb = parent[rb]
    if ra != rb:
        parent[ra] = rb


def dedupe_class(records, threshold):
    """records: list of dicts for a single class. Returns kept list."""
    n = len(records)
    if n == 0:
        return []

    # Exact MD5 dedup first.
    by_md5 = defaultdict(list)
    for r in records:
        by_md5[r["md5"]].append(r)
    md5_unique = []
    exact_removed = 0
    for md5, group in by_md5.items():
        if len(group) == 1:
            md5_unique.extend(group)
        else:
            md5_unique.append(sorted(group, key=lambda x: x["name"])[0])
            exact_removed += len(group) - 1

    # LSH banding index over both orientations.
    buckets = [defaultdict(list) for _ in range(BANDS)]
    for idx, r in enumerate(md5_unique):
        for b in range(BANDS):
            shift = b * BAND_BITS
            buckets[b][(r["h"] >> shift) & BAND_MASK].append(idx)
            buckets[b][(r["mh"] >> shift) & BAND_MASK].append(idx)

    parent = list(range(len(md5_unique)))
    candidate_pairs = set()
    BUCKET_CAP = 4096
    for b in range(BANDS):
        for key, idxs in buckets[b].items():
            if len(idxs) < 2 or len(idxs) > BUCKET_CAP:
                continue
            for i in range(len(idxs)):
                for j in range(i + 1, len(idxs)):
                    a, c = idxs[i], idxs[j]
                    if a == c:
                        continue
                    lo, hi = (a, c) if a < c else (c, a)
                    candidate_pairs.add((lo, hi))

    near_removed_unions = 0
    for a, c in candidate_pairs:
        ra, rc = md5_unique[a], md5_unique[c]
        d = min(
            hamming(ra["h"], rc["h"]),
            hamming(ra["h"], rc["mh"]),
            hamming(ra["mh"], rc["h"]),
            hamming(ra["mh"], rc["mh"]),
        )
        if d <= threshold:
            union_find_merge(parent, a, c)

    # Roots -> clusters.
    clusters = defaultdict(list)
    for i in range(len(md5_unique)):
        root = i
        while parent[root] != root:
            root = parent[root]
        clusters[root].append(md5_unique[i])

    kept = []
    near_removed = 0
    for members in clusters.values():
        members_sorted = sorted(members, key=lambda x: x["name"])
        kept.append(members_sorted[0])
        near_removed += len(members_sorted) - 1

    return kept, exact_removed, near_removed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--threshold", type=int, default=5,
                    help="pHash Hamming distance <= threshold = duplicate")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    files = list_files()
    print(f"[dedup] hashing {len(files)} images ...", flush=True)
    with Pool(args.workers) as pool:
        recs = pool.map(_hash_one, files, chunksize=64)

    by_class = defaultdict(list)
    for r in recs:
        by_class[r["ci"]].append(r)

    kept_all = []
    report = {
        "threshold": args.threshold,
        "total_input": len(recs),
        "per_class": {},
    }
    total_exact = total_near = 0
    for ci, cn in enumerate(CLASSES):
        cls_recs = by_class.get(ci, [])
        kept, exact_rm, near_rm = dedupe_class(cls_recs, args.threshold)
        total_exact += exact_rm
        total_near += near_rm
        for r in kept:
            kept_all.append({"path": r["path"], "class": cn, "class_idx": ci})
        report["per_class"][cn] = {
            "input": len(cls_recs),
            "kept": len(kept),
            "removed_exact_md5": exact_rm,
            "removed_near_phash": near_rm,
        }
        print(
            f"[dedup] {cn}: input={len(cls_recs)} kept={len(kept)} "
            f"exact_removed={exact_rm} near_removed={near_rm}",
            flush=True,
        )

    kept_all.sort(key=lambda x: (x["class"], x["path"]))
    manifest = {"classes": CLASSES, "threshold": args.threshold,
                "samples": [[k["path"], k["class_idx"]] for k in kept_all]}
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2))

    report.update({
        "total_kept": len(kept_all),
        "total_removed_exact_md5": total_exact,
        "total_removed_near_phash": total_near,
        "total_removed": total_exact + total_near,
        "manifest": str(OUT_MANIFEST),
    })
    OUT_REPORT.write_text(json.dumps(report, indent=2))

    print(
        f"[dedup] DONE input={report['total_input']} "
        f"kept={report['total_kept']} "
        f"removed={report['total_removed']} "
        f"(exact_md5={total_exact}, near_phash={total_near})",
        flush=True,
    )
    print(f"[dedup] manifest -> {OUT_MANIFEST}", flush=True)
    print(f"[dedup] report   -> {OUT_REPORT}", flush=True)


if __name__ == "__main__":
    main()
