import logging

import torch
import torch.nn as nn
import open_clip
from PIL import Image
from torchvision import models as tv_models, transforms as T

from app.config import MODELS_DIR, DEVICE, DISEASE_MODELS

logger = logging.getLogger(__name__)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class BiomedCLIPClassifier(nn.Module):
    """BiomedCLIP backbone + classifier head, matching the training checkpoint format."""

    def __init__(self, num_classes: int):
        super().__init__()
        self.backbone, _, self.preprocess = open_clip.create_model_and_transforms(
            "hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224"
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(512),
            nn.ReLU(),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        features = self.backbone.encode_image(x)
        if hasattr(features, "float"):
            features = features.float()
        return self.classifier(features)

    def get_visual(self):
        return self.backbone.visual


def _build_torchvision_model(arch: str, num_classes: int):
    """Build a torchvision classification model with a fresh head."""
    arch = (arch or "").lower()
    if arch in ("resnet50", "resnet_50", "resnet-50"):
        model = tv_models.resnet50(weights=None)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
    elif arch in ("densenet121", "densenet_121", "densenet-121"):
        model = tv_models.densenet121(weights=None)
        model.classifier = nn.Linear(model.classifier.in_features, num_classes)
    elif arch in ("convnext_small", "convnext-small", "convnextsmall"):
        model = tv_models.convnext_small(weights=None)
        model.classifier[2] = nn.Linear(model.classifier[2].in_features, num_classes)
    elif arch in ("convnext_base", "convnext-base"):
        model = tv_models.convnext_base(weights=None)
        model.classifier[2] = nn.Linear(model.classifier[2].in_features, num_classes)
    else:
        raise ValueError(f"Unsupported torchvision arch: {arch}")
    return model


def _detect_arch(checkpoint: dict, state: dict) -> str:
    """Infer architecture from checkpoint metadata or state-dict key shapes."""
    arch = (checkpoint.get("arch") or "").lower()
    if arch:
        return arch
    keys = set(state.keys())
    if any(k.startswith("backbone.visual.") for k in keys):
        return "biomedclip"
    if any(k.startswith("features.conv0") for k in keys):
        return "densenet121"
    if any(k.startswith("conv1.") and "fc." in keys for k in [next(iter(keys))]):
        return "resnet50"
    if "fc.weight" in keys and "fc.bias" in keys:
        return "resnet50"
    if any(k.startswith("features.0.0.") for k in keys) and "classifier.2.weight" in keys:
        return "convnext_small"
    if any(k.startswith("features.") for k in keys) and "classifier.weight" in keys:
        return "densenet121"
    raise ValueError("Unable to detect classifier architecture from checkpoint")


def _build_preprocess(img_size: int, mean, std) -> T.Compose:
    return T.Compose([
        T.Resize((img_size, img_size)),
        T.ToTensor(),
        T.Normalize(mean=mean or IMAGENET_MEAN, std=std or IMAGENET_STD),
    ])


class DiseaseClassifier:
    def __init__(self):
        self.loaded_models: dict[str, dict] = {}
        self.device = DEVICE

    def _load_model(self, disease: str):
        if disease in self.loaded_models:
            return

        info = DISEASE_MODELS.get(disease)
        if not info:
            raise ValueError(f"Unknown disease model: {disease}")

        checkpoint_path = MODELS_DIR / "disease_models" / disease / "classification" / "best_classifier.pt"
        if not checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

        classes = checkpoint.get("class_names") or info["classes"]
        if not classes:
            classes = [f"class_{i}" for i in range(checkpoint.get("num_classes", 2))]

        model_state = checkpoint.get("model_state", checkpoint.get("model_state_dict", checkpoint))
        num_classes = len(classes)

        arch = _detect_arch(checkpoint, model_state)
        logger.info(f"Loading {disease} classifier: arch={arch}, classes={classes}")

        if arch == "biomedclip":
            model = BiomedCLIPClassifier(num_classes)
            model.load_state_dict(model_state, strict=False)
            preprocess = model.preprocess
        else:
            model = _build_torchvision_model(arch, num_classes)
            model.load_state_dict(model_state, strict=False)
            img_size = checkpoint.get("img_size", 224)
            preprocess = _build_preprocess(
                img_size,
                checkpoint.get("normalization_mean"),
                checkpoint.get("normalization_std"),
            )

        model.to(self.device).eval()

        self.loaded_models[disease] = {
            "model": model,
            "classes": classes,
            "multilabel": info.get("multilabel", False),
            "preprocess": preprocess,
            "arch": arch,
        }
        logger.info(f"Loaded classifier for {disease}: arch={arch}, classes={classes}")

    @torch.no_grad()
    def predict(self, image: Image.Image, disease: str) -> dict:
        self._load_model(disease)
        entry = self.loaded_models[disease]

        model = entry["model"]
        classes = entry["classes"]
        multilabel = entry["multilabel"]
        preprocess = entry["preprocess"]

        img_tensor = preprocess(image).unsqueeze(0).to(self.device)
        logits = model(img_tensor).squeeze()

        if multilabel:
            probs = torch.sigmoid(logits)
            predictions = []
            for cls, prob in zip(classes, probs):
                if prob.item() > 0.5:
                    predictions.append({"class": cls, "probability": round(prob.item(), 4)})
            if not predictions:
                top_idx = probs.argmax().item()
                predictions.append({"class": classes[top_idx], "probability": round(probs[top_idx].item(), 4)})
            predictions.sort(key=lambda x: x["probability"], reverse=True)
        else:
            probs = torch.softmax(logits, dim=-1)
            top_k = torch.topk(probs, len(classes))
            predictions = [
                {"class": classes[idx.item()], "probability": round(val.item(), 4)}
                for idx, val in zip(top_k.indices, top_k.values)
            ]

        return {
            "disease": disease,
            "predictions": predictions,
            "top_prediction": predictions[0]["class"],
            "top_confidence": predictions[0]["probability"],
            "multilabel": multilabel,
            "arch": entry.get("arch"),
        }

    def get_model_and_preprocess(self, disease: str):
        """Return the loaded model and preprocess for XAI use."""
        self._load_model(disease)
        entry = self.loaded_models[disease]
        return entry["model"], entry["preprocess"]


classifier_instance = DiseaseClassifier()
