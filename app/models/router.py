import logging

import torch
from PIL import Image

from app.config import MODELS_DIR, DEVICE, ROUTER_CLASSES
from app.models.classifier import BiomedCLIPClassifier

logger = logging.getLogger(__name__)


class BiomedCLIPRouter:
    def __init__(self):
        self.model = None
        self.preprocess = None
        self.device = DEVICE
        self.classes = ROUTER_CLASSES

    def load(self):
        logger.info("Loading BiomedCLIP router...")
        checkpoint_path = MODELS_DIR / "biomedclip_router" / "best_biomedclip_router.pt"
        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

        # Use class names from checkpoint if available
        self.classes = checkpoint.get("class_names", ROUTER_CLASSES)

        model_state = checkpoint.get("model_state", checkpoint.get("model_state_dict", checkpoint))
        num_classes = len(self.classes)

        model = BiomedCLIPClassifier(num_classes)
        model.load_state_dict(model_state, strict=False)
        model.to(self.device).eval()

        self.model = model
        self.preprocess = model.preprocess
        logger.info(f"BiomedCLIP router loaded: {self.classes}")

    @torch.no_grad()
    def predict(self, image: Image.Image) -> dict:
        if self.model is None:
            self.load()

        img_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
        logits = self.model(img_tensor).squeeze()
        probs = torch.softmax(logits, dim=-1)
        top_k = torch.topk(probs, min(3, len(self.classes)))

        predicted_idx = top_k.indices[0].item()
        confidence = top_k.values[0].item()

        top3 = [
            {"class": self.classes[idx.item()], "confidence": round(val.item(), 4)}
            for idx, val in zip(top_k.indices, top_k.values)
        ]

        return {
            "modality": self.classes[predicted_idx],
            "modality_index": predicted_idx,
            "confidence": round(confidence, 4),
            "low_confidence": confidence < 0.75,
            "top3": top3,
        }


router_instance = BiomedCLIPRouter()
