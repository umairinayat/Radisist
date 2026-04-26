from rest_framework import serializers
from .models import Scan, Report, ScanCrop
from .pipeline_service import MODALITY_TO_DISEASE, ROUTER_CLASSES, file_to_base64


class ScanCropSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanCrop
        fields = ["id", "image", "x", "y", "width", "height", "created_at"]
        read_only_fields = fields

class ReportSerializer(serializers.ModelSerializer):
    radiologist_name = serializers.CharField(source='radiologist.user.full_name', read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'scan', 'radiologist', 'radiologist_name', 'content', 'impression', 'provider',
            'structured_report', 'report_error', 'is_final', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'radiologist']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')
        
        # If user is a Patient (and not the radiologist/admin), hide the full content unless it's final?
        # User requirement: "summarized report to user" (impression) and "full and editable report to radiologist" (content)
        
        if request and hasattr(request.user, 'role') and request.user.role == 'PATIENT':
            # Remove full content, only show impression (summary)
            representation.pop('content', None)
        
        return representation

    def create(self, validated_data):
        # Assign current user's radiologist profile if available
        request = self.context.get('request')
        if request and hasattr(request.user, 'radiologist'):
            validated_data['radiologist'] = request.user.radiologist
        return super().create(validated_data)


class ScanSerializer(serializers.ModelSerializer):
    report_id = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    total_latency_ms = serializers.SerializerMethodField()
    routing = serializers.SerializerMethodField()
    classification = serializers.SerializerMethodField()
    segmentation = serializers.SerializerMethodField()
    segmentation_overlay = serializers.SerializerMethodField()
    xai_heatmap = serializers.SerializerMethodField()
    xai_error = serializers.SerializerMethodField()
    report_provider = serializers.SerializerMethodField()
    report_error = serializers.SerializerMethodField()
    original_image = serializers.SerializerMethodField()
    ultrasound_options = serializers.SerializerMethodField()
    report = ReportSerializer(read_only=True)
    patient_name = serializers.CharField(source='patient.user.full_name', read_only=True)
    crops = ScanCropSerializer(many=True, read_only=True)
    
    class Meta:
        model = Scan
        fields = [
            'id', 'patient', 'patient_name', 'image', 'scan_type', 'title', 'description', 'created_at',
            'ai_generated', 'ai_predicted_class', 'ai_confidence', 'ai_benign_prob', 'ai_malignant_prob',
            'routed_modality', 'routed_confidence', 'disease_model', 'routing_top3', 'classification_result',
            'segmentation_result', 'segmentation_overlay_base64', 'xai_heatmap_base64', 'audit_trail',
            'analysis_metadata', 'report', 'crops',
            'report_id', 'timestamp', 'total_latency_ms', 'routing', 'classification', 'segmentation',
            'segmentation_overlay', 'xai_heatmap', 'xai_error', 'report_provider', 'report_error',
            'original_image', 'ultrasound_options'
        ]
        read_only_fields = [
            'id', 'created_at', 'patient', 
            'ai_generated', 'ai_predicted_class', 'ai_confidence', 'ai_benign_prob', 'ai_malignant_prob',
            'routed_modality', 'routed_confidence', 'disease_model', 'routing_top3', 'classification_result',
            'segmentation_result', 'segmentation_overlay_base64', 'xai_heatmap_base64', 'audit_trail',
            'analysis_metadata'
        ]

    def create(self, validated_data):
        # Assign current user's patient profile if available
        request = self.context.get('request')
        if request and hasattr(request.user, 'patient'):
            validated_data['patient'] = request.user.patient
        return super().create(validated_data)

    def _metadata(self, obj):
        return obj.analysis_metadata or {}

    def get_report_id(self, obj):
        return self._metadata(obj).get('report_id')

    def get_timestamp(self, obj):
        return self._metadata(obj).get('timestamp')

    def get_total_latency_ms(self, obj):
        return self._metadata(obj).get('total_latency_ms')

    def get_routing(self, obj):
        metadata = self._metadata(obj)
        modality_index = metadata.get('routing_modality_index')
        if modality_index is None and obj.routed_modality in ROUTER_CLASSES:
            modality_index = ROUTER_CLASSES.index(obj.routed_modality)

        if not obj.routed_modality and obj.routed_confidence is None and not obj.routing_top3:
            return None

        return {
            'modality': obj.routed_modality or None,
            'modality_index': modality_index,
            'confidence': obj.routed_confidence,
            'low_confidence': metadata.get('routing_low_confidence') if 'routing_low_confidence' in metadata else (obj.routed_confidence < 0.75 if obj.routed_confidence is not None else None),
            'top3': obj.routing_top3 or [],
        }

    def get_classification(self, obj):
        return obj.classification_result

    def get_segmentation(self, obj):
        return obj.segmentation_result

    def get_segmentation_overlay(self, obj):
        return obj.segmentation_overlay_base64 or None

    def get_xai_heatmap(self, obj):
        return obj.xai_heatmap_base64 or None

    def get_xai_error(self, obj):
        return self._metadata(obj).get('xai_error')

    def get_report_provider(self, obj):
        if hasattr(obj, 'report') and obj.report:
            return obj.report.provider or self._metadata(obj).get('report_provider')
        return self._metadata(obj).get('report_provider')

    def get_report_error(self, obj):
        if hasattr(obj, 'report') and obj.report:
            return obj.report.report_error or self._metadata(obj).get('report_error')
        return self._metadata(obj).get('report_error')

    def get_original_image(self, obj):
        if not obj.image:
            return None
        try:
            return file_to_base64(obj.image.path)
        except Exception:
            return None

    def get_ultrasound_options(self, obj):
        metadata = self._metadata(obj)
        options = metadata.get('ultrasound_options')
        if options is not None:
            return options

        routing = self.get_routing(obj)
        if not routing:
            return None

        modality_index = routing.get('modality_index')
        if modality_index == 3:
            return MODALITY_TO_DISEASE.get(modality_index, [])
        return None
