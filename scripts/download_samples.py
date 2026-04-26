"""Download ~100 sample images per disease class from public HF datasets.

Streams each dataset, buckets by mapped disease class, saves resized JPEGs.
Resumable: skips classes that already have N images.

Output: /mnt/HC_Volume_105521066/radisist_samples/{disease}/{class}/{idx}.jpg
        (also visible at app/static/samples/ via symlink)
"""
import io
import os
import sys
import logging
import itertools
from pathlib import Path
from PIL import Image

os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'

from datasets import load_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("samples")

ROOT = Path("/mnt/HC_Volume_105521066/radisist_samples")
ROOT.mkdir(parents=True, exist_ok=True)
TOKEN = os.environ.get("HF_TOKEN") or open("/root/fyp/.env").read().split("HF_TOKEN=")[1].split("\n")[0].strip()
PER_CLASS = 100
MAX_DIM = 384  # resize for storage efficiency; still good for display
SCAN_LIMIT = 30000  # max records to scan per dataset before giving up


def save_image(img, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(img, dict) and "bytes" in img:
        img = Image.open(io.BytesIO(img["bytes"]))
    if not isinstance(img, Image.Image):
        img = Image.open(io.BytesIO(img)) if isinstance(img, (bytes, bytearray)) else Image.fromarray(img)
    img = img.convert("RGB")
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
    img.save(out_path, "JPEG", quality=85)


def collect(disease: str, classes: list[str], dataset_iter, mapper, target=PER_CLASS):
    """Stream `dataset_iter`, bucket by class via `mapper(record) -> class or None`."""
    counts = {c: 0 for c in classes}
    # check existing
    for c in classes:
        d = ROOT / disease / c
        if d.exists():
            counts[c] = len(list(d.glob("*.jpg")))
    log.info(f"[{disease}] starting — existing: {counts}")
    if all(v >= target for v in counts.values()):
        log.info(f"[{disease}] already complete")
        return

    scanned = 0
    for rec in itertools.islice(dataset_iter, SCAN_LIMIT):
        scanned += 1
        try:
            cls = mapper(rec)
        except Exception:
            continue
        if cls is None or cls not in counts or counts[cls] >= target:
            continue
        try:
            img_field = rec.get("image") or rec.get("png") or rec.get("pixel_values")
            if img_field is None:
                continue
            idx = counts[cls]
            out = ROOT / disease / cls / f"{idx:03d}.jpg"
            save_image(img_field, out)
            counts[cls] += 1
        except Exception as e:
            log.warning(f"[{disease}] save failed: {e}")
        if all(v >= target for v in counts.values()):
            break
    log.info(f"[{disease}] scanned={scanned}  final={counts}")


def do_microscopy():
    ds = load_dataset("1aurent/PatchCamelyon", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=2000)
    classes = ["no_metastasis", "metastasis"]
    def mapper(r): return classes[int(r["label"])] if r["label"] in (0, 1) else None
    collect("microscopy", classes, ds, mapper)


def do_dermatology():
    ds = load_dataset("marmal88/skin_cancer", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=3000)
    malignant_dx = {"melanoma", "basal_cell_carcinoma", "actinic_keratoses"}
    benign_dx = {"melanocytic_Nevi", "vascular_lesions", "dermatofibroma", "benign_keratosis-like_lesions"}
    def mapper(r):
        dx = r.get("dx", "")
        if dx in malignant_dx: return "malignant"
        if dx in benign_dx: return "non_malignant"
        return None
    collect("dermatology", ["malignant", "non_malignant"], ds, mapper)


def do_chest_xray():
    ds = load_dataset("BahaaEldin0/NIH-Chest-Xray-14", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=3000)
    target_classes = [
        "atelectasis", "cardiomegaly", "consolidation", "edema", "effusion",
        "emphysema", "fibrosis", "hernia", "infiltration", "mass",
        "no_finding", "nodule", "pleural_thickening", "pneumonia", "pneumothorax",
    ]
    label_map = {
        "Atelectasis": "atelectasis", "Cardiomegaly": "cardiomegaly", "Consolidation": "consolidation",
        "Edema": "edema", "Effusion": "effusion", "Emphysema": "emphysema", "Fibrosis": "fibrosis",
        "Hernia": "hernia", "Infiltration": "infiltration", "Mass": "mass", "No Finding": "no_finding",
        "Nodule": "nodule", "Pleural_Thickening": "pleural_thickening", "Pneumonia": "pneumonia",
        "Pneumothorax": "pneumothorax",
    }
    def mapper(r):
        labs = r.get("label", [])
        if not isinstance(labs, list) or not labs:
            return None
        # use the first mapped label
        for l in labs:
            if l in label_map:
                return label_map[l]
        return None
    collect("chest_xray", target_classes, ds, mapper)


def do_endoscopy():
    ds = load_dataset("YukiTashiro/hyper-kvasir", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=3000)
    def mapper(r):
        c = (r.get("class-name") or "").lower()
        if "barrett" in c: return "barretts"
        if "oesophagitis" in c or "esophagitis" in c: return "esophagitis"
        if "polyp" in c: return "polyp"
        if "ulcerative-colitis" in c: return "ulcerative_colitis"
        return None
    collect("endoscopy", ["barretts", "esophagitis", "polyp", "ulcerative_colitis"], ds, mapper)


def do_breast_ultrasound():
    ds = load_dataset("m-nast76/breast-ultrasound-dataset", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=600)
    def mapper(r):
        t = (r.get("text") or "").lower()
        if "malignant" in t: return "malignant"
        if "benign" in t: return "benign"
        if "normal" in t: return "normal"
        return None
    collect("breast_ultrasound", ["benign", "malignant", "normal"], ds, mapper)


def do_mammography():
    ds = load_dataset("dpetrini/cbis_ddsm_rev", split="train", streaming=True, token=TOKEN)
    def mapper(r):
        k = (r.get("__key__") or "").lower()
        if "/malign" in k: return "MALIGNANT"
        if "/benign" in k: return "BENIGN"
        return None
    collect("mammography", ["BENIGN", "MALIGNANT"], ds, mapper)


def do_fundus():
    ds = load_dataset("EslamHasan/APTOS2019DiabeticRetinopathy", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=2000)
    def mapper(r):
        l = r.get("label")
        if l == 0: return "no_retinal_disease"
        if isinstance(l, int) and 1 <= l <= 4: return "retinal_disease"
        return None
    collect("fundus_retinography", ["no_retinal_disease", "retinal_disease"], ds, mapper)


def do_thyroid():
    ds = load_dataset("BTX24/thyroid-cancer-classification-ultrasound-dataset", split="train", streaming=True, token=TOKEN).shuffle(seed=42, buffer_size=500)
    # 0 -> low_risk, 1 -> suspicious (BTX24 binary label, 0 typically benign/non-malignant)
    def mapper(r):
        l = r.get("label")
        if l == 0: return "low_risk"
        if l == 1: return "suspicious"
        return None
    collect("thyroid_ultrasound", ["low_risk", "suspicious"], ds, mapper)


JOBS = {
    "microscopy": do_microscopy,
    "dermatology": do_dermatology,
    "chest_xray": do_chest_xray,
    "endoscopy": do_endoscopy,
    "breast_ultrasound": do_breast_ultrasound,
    "mammography": do_mammography,
    "fundus_retinography": do_fundus,
    "thyroid_ultrasound": do_thyroid,
}


def main():
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for name, fn in JOBS.items():
        if only and name not in only:
            continue
        log.info(f"--- {name} ---")
        try:
            fn()
        except Exception as e:
            log.error(f"[{name}] failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()
