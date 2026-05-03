import os

from django.core.files.base import ContentFile
from django.db import models
from django.utils import timezone

from apps.users.models import Patient, Radiologist, User

class Scan(models.Model):
    SCAN_TYPES = [
        ('MRI', 'MRI'),
        ('CT', 'CT Scan'),
        ('XRAY', 'X-Ray'),
        ('MAMMOGRAM', 'Mammogram'),
        ('OTHER', 'Other'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='scans')
    image = models.ImageField(upload_to='scans/%Y/%m/%d/')
    scan_type = models.CharField(max_length=20, choices=SCAN_TYPES, default='MAMMOGRAM')
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # AI Fields
    ai_generated = models.BooleanField(default=False)
    ai_predicted_class = models.CharField(max_length=50, blank=True, null=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_benign_prob = models.FloatField(null=True, blank=True)
    ai_malignant_prob = models.FloatField(null=True, blank=True)
    routed_modality = models.CharField(max_length=100, blank=True)
    routed_confidence = models.FloatField(null=True, blank=True)
    disease_model = models.CharField(max_length=100, blank=True)
    routing_top3 = models.JSONField(default=list, blank=True)
    classification_result = models.JSONField(null=True, blank=True)
    segmentation_result = models.JSONField(null=True, blank=True)
    segmentation_overlay_base64 = models.TextField(blank=True)
    xai_heatmap_base64 = models.TextField(blank=True)
    audit_trail = models.JSONField(default=list, blank=True)
    analysis_metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.scan_type} for {self.patient} - {self.created_at.strftime('%Y-%m-%d')}"

    def build_clinical_context(self):
        patient = self.patient
        user = patient.user
        return {
            "clinical_notes": self.description or "",
            "patient_age": user.age,
            "patient_gender": user.gender,
            "symptoms": patient.symptoms,
            "lifestyle": patient.lifestyle,
            "previous_breast_disease": patient.previous_breast_disease,
            "family_breast_cancer": patient.family_breast_cancer,
            "hormonal_therapy": patient.hormonal_therapy,
        }

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Trigger AI prediction if it's a new scan and has an image
        if is_new and self.image and not getattr(self, "_skip_auto_analysis", False):
            self.run_ai_prediction()

    def run_ai_prediction(self, force_disease=None):
        if not self.image:
            return

        try:
            image_path = self.image.path
            if not os.path.exists(image_path):
                print(f"Image not found at {image_path}")
                return

            from .pipeline_service import analyze_medical_image

            with open(image_path, "rb") as image_file:
                result = analyze_medical_image(
                    image_file.read(),
                    os.path.basename(image_path),
                    force_disease=force_disease,
                    clinical_context=self.build_clinical_context(),
                )

            if not result:
                return

            classification = result.get("classification") or {}
            predictions = classification.get("predictions") or []
            top_prediction = classification.get("top_prediction")
            top_confidence = classification.get("top_confidence")

            benign_prob = None
            malignant_prob = None
            for prediction in predictions:
                label = prediction.get("class", "").lower()
                probability = prediction.get("probability")
                if probability is None:
                    continue
                if label == "benign":
                    benign_prob = probability
                if label == "malignant":
                    malignant_prob = probability

            self.ai_generated = bool(classification)
            self.ai_predicted_class = top_prediction
            self.ai_confidence = top_confidence
            self.ai_benign_prob = benign_prob
            self.ai_malignant_prob = malignant_prob
            self.routed_modality = result.get("routing", {}).get("modality", "")
            self.routed_confidence = result.get("routing", {}).get("confidence")
            self.disease_model = result.get("disease_model") or ""
            self.routing_top3 = result.get("routing", {}).get("top3") or []
            self.classification_result = classification or None
            self.segmentation_result = result.get("segmentation") or None
            self.segmentation_overlay_base64 = result.get("segmentation_overlay") or ""
            self.xai_heatmap_base64 = result.get("xai_heatmap") or ""
            self.audit_trail = result.get("audit_trail") or []
            self.analysis_metadata = {
                "report_id": result.get("report_id"),
                "timestamp": result.get("timestamp"),
                "total_latency_ms": result.get("total_latency_ms"),
                "routing_modality_index": result.get("routing", {}).get("modality_index"),
                "routing_low_confidence": result.get("routing", {}).get("low_confidence"),
                "ultrasound_options": result.get("ultrasound_options"),
                "xai_error": result.get("xai_error"),
                "report_provider": result.get("report_provider"),
                "report_error": result.get("report_error"),
                "safety": result.get("safety"),
                "image_quality": result.get("image_quality"),
                "clinical_context": result.get("clinical_context"),
                "model_versions": result.get("model_versions"),
            }

            self.save(update_fields=[
                "ai_generated",
                "ai_predicted_class",
                "ai_confidence",
                "ai_benign_prob",
                "ai_malignant_prob",
                "routed_modality",
                "routed_confidence",
                "disease_model",
                "routing_top3",
                "classification_result",
                "segmentation_result",
                "segmentation_overlay_base64",
                "xai_heatmap_base64",
                "audit_trail",
                "analysis_metadata",
            ])

            structured_report = result.get("report")
            if isinstance(structured_report, dict):
                report_content = structured_report.get("raw_text") or structured_report.get("summary") or "Automated AI analysis completed."
                impression_summary = structured_report.get("summary") or f"AI Prediction: {top_prediction}"
            else:
                report_content = "Automated AI analysis completed."
                impression_summary = f"AI Prediction: {top_prediction}" if top_prediction else "AI analysis completed"

            report, created = Report.objects.get_or_create(
                scan=self,
                defaults={
                    "content": report_content,
                    "impression": impression_summary,
                    "is_final": False,
                    "provider": result.get("report_provider") or "",
                    "structured_report": structured_report if isinstance(structured_report, dict) else None,
                    "report_error": result.get("report_error") or "",
                },
            )

            if not created and not report.is_final:
                report.content = report_content
                report.impression = impression_summary
                report.provider = result.get("report_provider") or ""
                report.structured_report = structured_report if isinstance(structured_report, dict) else None
                report.report_error = result.get("report_error") or ""
                report.save(update_fields=[
                    "content",
                    "impression",
                    "provider",
                    "structured_report",
                    "report_error",
                    "updated_at",
                ])

            safety = result.get("safety") or {}
            if safety.get("needs_radiologist_review"):
                Notification.notify_radiologists_scan_needs_review(self, safety)
        except Exception as e:
            print(f"Failed to run AI prediction: {e}")


class Report(models.Model):
    scan = models.OneToOneField(Scan, on_delete=models.CASCADE, related_name='report')
    radiologist = models.ForeignKey(Radiologist, on_delete=models.SET_NULL, null=True, related_name='reports')
    content = models.TextField(help_text="Full medical report")
    impression = models.TextField(help_text="Summary of findings", blank=True)
    provider = models.CharField(max_length=100, blank=True)
    structured_report = models.JSONField(null=True, blank=True)
    report_error = models.TextField(blank=True)
    is_final = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report for Scan {self.scan.pk} by {self.radiologist}"


class ScanCrop(models.Model):
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE, related_name="crops")
    image = models.ImageField(upload_to="scan_crops/%Y/%m/%d/")
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Crop {self.pk} for Scan {self.scan_id}"

    @classmethod
    def from_upload(cls, scan, uploaded_file, x=0, y=0, width=0, height=0):
        crop = cls(scan=scan, x=x, y=y, width=width, height=height)
        crop.image.save(uploaded_file.name, ContentFile(uploaded_file.read()), save=False)
        crop.save()
        return crop


class Notification(models.Model):
    SCAN_NEEDS_REVIEW = "SCAN_NEEDS_REVIEW"
    REPORT_FINALIZED = "REPORT_FINALIZED"

    NOTIFICATION_TYPES = [
        (SCAN_NEEDS_REVIEW, "Scan needs review"),
        (REPORT_FINALIZED, "Report finalized"),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="radiology_notifications")
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    report = models.ForeignKey(Report, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    notification_type = models.CharField(max_length=40, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read_at"]),
            models.Index(fields=["notification_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient}"

    @property
    def is_read(self):
        return self.read_at is not None

    def mark_read(self):
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=["read_at"])

    @classmethod
    def notify_radiologists_scan_needs_review(cls, scan, safety=None):
        safety = safety or {}
        warnings = safety.get("warnings") or []
        message = "A new AI-assisted scan needs radiologist review."
        if warnings:
            message = f"{message} Safety note: {warnings[0]}"

        for radiologist in Radiologist.objects.select_related("user").all():
            notification, created = cls.objects.get_or_create(
                recipient=radiologist.user,
                scan=scan,
                notification_type=cls.SCAN_NEEDS_REVIEW,
                defaults={
                    "title": "Scan needs radiologist review",
                    "message": message,
                },
            )
            if not created:
                notification.title = "Scan needs radiologist review"
                notification.message = message
                notification.read_at = None
                notification.save(update_fields=["title", "message", "read_at"])

    @classmethod
    def notify_patient_report_finalized(cls, report):
        scan = report.scan
        title = "Your radiology report is finalized"
        message = report.impression or "Your finalized radiology report is ready to view."
        notification, created = cls.objects.get_or_create(
            recipient=scan.patient.user,
            scan=scan,
            report=report,
            notification_type=cls.REPORT_FINALIZED,
            defaults={"title": title, "message": message},
        )
        if not created:
            notification.title = title
            notification.message = message
            notification.read_at = None
            notification.save(update_fields=["title", "message", "read_at"])
