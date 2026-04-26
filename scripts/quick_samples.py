"""Ensure exactly 5 sample images per disease (modality), any class.

Reuses existing samples where present; downloads only missing ones.
Output: /mnt/HC_Volume_105521066/radisist_samples/{disease}/sample_{i}.jpg
        (flat structure — no class subfolders for the 5-per-modality view)
"""
import io
import os
import logging
import itertools
from pathlib import Path
from PIL import Image

os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'
from datasets import load_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("quick")

ROOT = Path("/mnt/HC_Volume_105521066/radisist_samples")
TOKEN = open("/root/fyp/.env").read().split("HF_TOKEN=")[1].split("\n")[0].strip()
TARGET = 5
MAX_DIM = 384


def save_image(img, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(img, dict) and "bytes" in img:
        img = Image.open(io.BytesIO(img["bytes"]))
    if not isinstance(img, Image.Image):
        img = Image.open(io.BytesIO(img)) if isinstance(img, (bytes, bytearray)) else Image.fromarray(img)
    img.convert("RGB").copy()
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
    img.convert("RGB").save(out_path, "JPEG", quality=85)


def reuse_existing(disease: str) -> int:
    """If we already have class subfolders with images, copy 5 into the flat layout."""
    flat_dir = ROOT / disease
    flat_dir.mkdir(parents=True, exist_ok=True)
    flat_existing = sorted(flat_dir.glob("sample_*.jpg"))
    if len(flat_existing) >= TARGET:
        return TARGET
    # delete partial
    for p in flat_existing:
        p.unlink()
    # gather from class subdirs
    candidates = []
    for sub in flat_dir.iterdir():
        if sub.is_dir():
            candidates.extend(sorted(sub.glob("*.jpg"))[:3])
    candidates = candidates[:TARGET]
    for i, src in enumerate(candidates):
        dest = flat_dir / f"sample_{i:02d}.jpg"
        dest.write_bytes(src.read_bytes())
    return len(candidates)


def cleanup_class_subdirs(disease: str):
    """Remove the per-class subdirectories now that flat samples exist."""
    flat_dir = ROOT / disease
    if not flat_dir.exists():
        return
    for sub in list(flat_dir.iterdir()):
        if sub.is_dir():
            for f in sub.iterdir():
                f.unlink()
            sub.rmdir()


def fetch_n(disease: str, repo: str, image_field: str = "image", n_needed: int = TARGET, scan_limit: int = 5000):
    """Download up to n_needed images from a streaming HF dataset into ROOT/disease/."""
    flat_dir = ROOT / disease
    flat_dir.mkdir(parents=True, exist_ok=True)
    have = len(list(flat_dir.glob("sample_*.jpg")))
    if have >= n_needed:
        log.info(f"[{disease}] already have {have}")
        return
    log.info(f"[{disease}] fetching from {repo} (have={have}, need={n_needed})")
    try:
        ds = load_dataset(repo, split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=200)
    except Exception as e:
        log.error(f"[{disease}] cannot load {repo}: {e}")
        return
    saved = have
    for rec in itertools.islice(ds, scan_limit):
        if saved >= n_needed:
            break
        try:
            img = rec.get(image_field)
            if img is None:
                continue
            out = flat_dir / f"sample_{saved:02d}.jpg"
            save_image(img, out)
            saved += 1
        except Exception:
            continue
    log.info(f"[{disease}] saved {saved} total")


SOURCES = {
    "breast_ultrasound": ("m-nast76/breast-ultrasound-dataset", "image"),
    "mammography":       ("dpetrini/cbis_ddsm_rev",             "png"),
    "fundus_retinography": ("EslamHasan/APTOS2019DiabeticRetinopathy", "image"),
    "thyroid_ultrasound": ("BTX24/thyroid-cancer-classification-ultrasound-dataset", "image"),
}


def main():
    # Step 1: reuse existing samples where present
    for disease in ["microscopy", "dermatology", "chest_xray", "endoscopy"]:
        n = reuse_existing(disease)
        log.info(f"[{disease}] reused {n} samples from class subdirs")
        cleanup_class_subdirs(disease)

    # Step 2: download missing ones
    for disease, (repo, field) in SOURCES.items():
        fetch_n(disease, repo, image_field=field)


if __name__ == "__main__":
    main()
