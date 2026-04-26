import json
import logging
from pathlib import Path

import torch
import torch.nn as nn
import open_clip
from PIL import Image

from app.config import MODELS_DIR, DEVICE, DISEASE_MODELS

logger = logging.getLogger(__name__)


class BiomedCLIPClassifier(nn.Module):
    """BiomedCLIP backbone + classifier head, matching the training checkpoint format."""

    def __init__(self, num_classes: int):
        super().__init__()
        self.backbone, _, self.preprocess = open_clip.create_model_and_transforms(
            "hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224"
        )
        # Classifier head: LayerNorm(512) -> Linear(512, num_classes)
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

        # Extract class names from checkpoint or config
        classes = checkpoint.get("class_names", info["classes"])
        if not classes:
            classes = [f"class_{i}" for i in range(2)]  # fallback

        model_state = checkpoint.get("model_state", checkpoint.get("model_state_dict", checkpoint))
        num_classes = len(classes)

        # Build model
        model = BiomedCLIPClassifier(num_classes)
        model.load_state_dict(model_state, strict=False)
        model.to(self.device).eval()

        self.loaded_models[disease] = {
            "model": model,
            "classes": classes,
            "multilabel": info.get("multilabel", False),
            "preprocess": model.preprocess,
        }
        logger.info(f"Loaded classifier for {disease}: {classes}")

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
        }

    def get_model_and_preprocess(self, disease: str):
        """Return the loaded model and preprocess for XAI use."""
        self._load_model(disease)
        entry = self.loaded_models[disease]
        return entry["model"], entry["preprocess"]


classifier_instance = DiseaseClassifier()
