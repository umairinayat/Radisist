import base64
import io
import textwrap

from django.http import FileResponse, Http404, HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, Scan, Report, ScanCrop
from .pipeline_service import get_pipeline_models, get_sample_gallery, route_medical_image
from .serializers import NotificationSerializer, ScanCropSerializer, ScanSerializer, ReportSerializer
from apps.users.models import User


def _safe_pdf_text(value):
    return str(value or "").replace("\r", " ").encode("latin-1", "replace").decode("latin-1")


def _load_base64_image(value):
    if not value:
        return None
    try:
        if value.startswith("data:"):
            value = value.split(",", 1)[1]
        from PIL import Image

        return Image.open(io.BytesIO(base64.b64decode(value))).convert("RGB")
    except Exception:
        return None


def _fit_image(image, max_width, max_height):
    image = image.copy()
    image.thumbnail((max_width, max_height))
    return image


def _draw_wrapped(draw, text, x, y, max_chars, font, fill=(36, 36, 36), line_height=20):
    text = _safe_pdf_text(text)
    for paragraph in text.splitlines() or [""]:
        lines = textwrap.wrap(paragraph, width=max_chars) or [""]
        for line in lines:
            draw.text((x, y), line, font=font, fill=fill)
            y += line_height
        y += 6
    return y


def _new_pdf_page():
    from PIL import Image, ImageDraw, ImageFont

    page = Image.new("RGB", (1240, 1754), "white")
    draw = ImageDraw.Draw(page)
    font = ImageFont.load_default()
    return page, draw, font


def build_report_pdf(report):
    from PIL import Image

    scan = report.scan
    structured = report.structured_report or {}
    citations = structured.get("evidence_citations") or []
    model_versions = (scan.analysis_metadata or {}).get("model_versions") or {}
    pages = []

    page, draw, font = _new_pdf_page()
    y = 70
    draw.text((70, y), "Radisist Final Radiology Report", font=font, fill=(125, 31, 63))
    y += 45
    draw.text((70, y), f"Report ID: {report.id}    Scan ID: {scan.id}", font=font, fill=(50, 50, 50))
    y += 35
    draw.text((70, y), f"Patient: {_safe_pdf_text(scan.patient.user.full_name)}", font=font, fill=(50, 50, 50))
    y += 25
    draw.text((70, y), f"Age/Gender: {scan.patient.user.age or '-'} / {scan.patient.user.gender or '-'}", font=font, fill=(50, 50, 50))
    y += 25
    draw.text((70, y), f"Modality: {_safe_pdf_text(scan.routed_modality or scan.scan_type)}", font=font, fill=(50, 50, 50))
    y += 25
    draw.text((70, y), f"Disease model: {_safe_pdf_text(scan.disease_model)}", font=font, fill=(50, 50, 50))
    y += 25
    draw.text((70, y), f"Finalized: {timezone.localtime(report.updated_at).strftime('%Y-%m-%d %H:%M')}", font=font, fill=(50, 50, 50))
    y += 45
    draw.text((70, y), "Final Impression", font=font, fill=(125, 31, 63))
    y += 30
    y = _draw_wrapped(draw, report.impression or structured.get("summary"), 70, y, 140, font)
    y += 20
    draw.text((70, y), "AI Summary", font=font, fill=(125, 31, 63))
    y += 30
    y = _draw_wrapped(draw, structured.get("summary") or "No AI summary stored.", 70, y, 140, font)
    y += 20
    draw.text((70, y), "Model Traceability", font=font, fill=(125, 31, 63))
    y += 30
    trace_lines = [
        f"Router: {model_versions.get('router', {}).get('name', '-')}",
        f"Router checkpoint: {model_versions.get('router', {}).get('checkpoint', '-')}",
        f"Classifier: {model_versions.get('classifier', {}).get('name', '-')}",
        f"Classifier checkpoint: {model_versions.get('classifier', {}).get('checkpoint', '-')}",
        f"Segmentor: {model_versions.get('segmentor', {}).get('name', 'Not used')}",
        f"Report provider: {model_versions.get('reporting', {}).get('provider_used', report.provider or '-')}",
    ]
    y = _draw_wrapped(draw, "\n".join(trace_lines), 70, y, 140, font)
    y += 25
    draw.text((70, y), f"Radiologist signature: Dr. {_safe_pdf_text(report.radiologist.user.full_name if report.radiologist else 'Unassigned')}", font=font, fill=(20, 20, 20))
    y += 35
    y = _draw_wrapped(draw, structured.get("disclaimer") or "AI output is decision support only.", 70, y, 140, font, fill=(120, 80, 0))
    pages.append(page)

    image_page, draw, font = _new_pdf_page()
    y = 70
    draw.text((70, y), "Image Evidence", font=font, fill=(125, 31, 63))
    y += 45
    panels = []
    if scan.image:
        try:
            panels.append(("Original image", Image.open(scan.image.path).convert("RGB")))
        except Exception:
            pass
    heatmap = _load_base64_image(scan.xai_heatmap_base64)
    if heatmap:
        panels.append(("Grad-CAM++ heatmap", heatmap))
    segmentation = _load_base64_image(scan.segmentation_overlay_base64)
    if segmentation:
        panels.append(("Segmentation overlay", segmentation))

    x_positions = [70, 645]
    for index, (label, image) in enumerate(panels[:4]):
        x = x_positions[index % 2]
        panel_y = y + (index // 2) * 760
        draw.text((x, panel_y), label, font=font, fill=(50, 50, 50))
        fitted = _fit_image(image, 500, 650)
        image_page.paste(fitted, (x, panel_y + 35))
    if not panels:
        draw.text((70, y), "No image evidence was available for PDF export.", font=font, fill=(50, 50, 50))
    pages.append(image_page)

    text_page, draw, font = _new_pdf_page()
    y = 70
    draw.text((70, y), "Full Report And Citations", font=font, fill=(125, 31, 63))
    y += 45
    y = _draw_wrapped(draw, report.content, 70, y, 140, font)
    if y > 1400:
        pages.append(text_page)
        text_page, draw, font = _new_pdf_page()
        y = 70
    y += 20
    draw.text((70, y), "Citations", font=font, fill=(125, 31, 63))
    y += 30
    if citations:
        for citation in citations:
            citation_text = f"{citation.get('id', '')}: {citation.get('source', '')} {citation.get('url', '')}"
            y = _draw_wrapped(draw, citation_text, 70, y, 140, font)
            if y > 1580:
                pages.append(text_page)
                text_page, draw, font = _new_pdf_page()
                y = 70
    else:
        y = _draw_wrapped(draw, "No citations stored.", 70, y, 140, font)
    pages.append(text_page)

    buffer = io.BytesIO()
    pages[0].save(buffer, format="PDF", save_all=True, append_images=pages[1:])
    buffer.seek(0)
    return buffer

class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.PATIENT

class IsRadiologist(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.RADIOLOGIST


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread") in {"1", "true", "yes"}:
            queryset = queryset.filter(read_at__isnull=True)
        return queryset.select_related("scan", "report")

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.mark_read()
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        now = timezone.now()
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=now)
        return Response({"updated": updated})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(read_at__isnull=True).count()})

class ScanViewSet(viewsets.ModelViewSet):
    serializer_class = ScanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'patient__user__full_name']
    ordering_fields = ['created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role == User.PATIENT:
            return Scan.objects.filter(patient__user=user)
        elif user.role == User.RADIOLOGIST:
            return Scan.objects.all() # Radiologists see all scans
        elif user.role == User.ADMIN or user.is_staff:
            return Scan.objects.all()
        return Scan.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.PATIENT:
            serializer.save(patient=user.patient)
        else:
            # If admin creates, they must specify patient? 
            # For now, let's assume admin creation requires passing patient ID if not caught by serializer logic
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def rerun_ai(self, request, pk=None):
        """Manually trigger AI prediction for a scan"""
        scan = self.get_object()
        if not scan.image:
            return Response({'error': 'No image associated with this scan'}, status=status.HTTP_400_BAD_REQUEST)
        
        scan.run_ai_prediction(force_disease=request.data.get("force_disease"))
        scan.refresh_from_db()
        serializer = self.get_serializer(scan)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsRadiologist], url_path='accept-case')
    def accept_case(self, request, pk=None):
        scan = self.get_object()
        radiologist = request.user.radiologist
        report, _ = Report.objects.get_or_create(
            scan=scan,
            defaults={
                "radiologist": radiologist,
                "content": scan.report.content if hasattr(scan, "report") else "AI draft awaiting radiologist review.",
                "impression": scan.report.impression if hasattr(scan, "report") else "Awaiting radiologist review.",
                "is_final": False,
            },
        )

        if report.radiologist_id and report.radiologist_id != radiologist.id:
            return Response(
                {"error": "This case has already been accepted by another radiologist."},
                status=status.HTTP_409_CONFLICT,
            )

        if not report.radiologist_id:
            report.radiologist = radiologist
            report.save(update_fields=["radiologist", "updated_at"])

        serializer = self.get_serializer(scan)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser],
        url_path='save-crop',
    )
    def save_crop(self, request, pk=None):
        scan = self.get_object()
        uploaded_file = request.FILES.get("image")
        if not uploaded_file:
            return Response({"error": "Crop image is required."}, status=status.HTTP_400_BAD_REQUEST)

        crop = ScanCrop.objects.create(
            scan=scan,
            image=uploaded_file,
            x=int(request.data.get("x", 0) or 0),
            y=int(request.data.get("y", 0) or 0),
            width=int(request.data.get("width", 0) or 0),
            height=int(request.data.get("height", 0) or 0),
        )
        return Response(ScanCropSerializer(crop, context={"request": request}).data, status=status.HTTP_201_CREATED)


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.PATIENT:
            # Patients can only see reports for their scans
            return Report.objects.filter(scan__patient__user=user)
        elif user.role == User.RADIOLOGIST:
            # Radiologists can see all reports, or reports they authored
            return Report.objects.all()
        return Report.objects.all()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsRadiologist()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(radiologist=self.request.user.radiologist)

    def perform_update(self, serializer):
        kwargs = {}
        if hasattr(self.request.user, "radiologist"):
            kwargs["radiologist"] = self.request.user.radiologist
        serializer.save(**kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsRadiologist])
    def finalize(self, request, pk=None):
        report = self.get_object()
        radiologist = request.user.radiologist

        if report.radiologist_id and report.radiologist_id != radiologist.id:
            return Response(
                {"error": "Only the assigned radiologist can finalize this report."},
                status=status.HTTP_409_CONFLICT,
            )

        report.radiologist = radiologist
        report.content = request.data.get("content", report.content)
        report.impression = request.data.get("impression", report.impression)
        if "structured_report" in request.data:
            report.structured_report = request.data.get("structured_report")
        report.is_final = True
        report.save(update_fields=[
            "radiologist",
            "content",
            "impression",
            "structured_report",
            "is_final",
            "updated_at",
        ])

        scan = report.scan
        metadata = scan.analysis_metadata or {}
        metadata["patient_summary"] = report.impression or report.content[:500]
        metadata["patient_summary_sent_at"] = timezone.now().isoformat()
        metadata["finalized_by"] = radiologist.user.full_name
        scan.analysis_metadata = metadata
        scan.save(update_fields=["analysis_metadata"])
        Notification.notify_patient_report_finalized(report)

        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['get'], permission_classes=[IsRadiologist], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        report = self.get_object()
        if not report.is_final:
            return Response(
                {"error": "Only finalized reports can be exported as PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_buffer = build_report_pdf(report)
        filename = f"radisist-report-{report.id}.pdf"
        response = HttpResponse(pdf_buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class PipelineHealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "Radisist Django Pipeline"})


class PipelineModelsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(get_pipeline_models())


class PipelineSamplesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        limit = int(request.query_params.get("limit", 5) or 5)
        diseases = []
        for disease in get_sample_gallery(limit=limit):
            diseases.append(
                {
                    **disease,
                    "thumbnails": [
                        request.build_absolute_uri(
                            f"/api/radiology/pipeline/samples/{disease['disease']}/{filename}/"
                        )
                        for filename in disease["thumbnails"]
                    ],
                }
            )
        return Response({"diseases": diseases})


class PipelineSampleImageView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, disease, filename):
        from .pipeline_service import SAMPLES_DIR

        file_path = SAMPLES_DIR / disease / filename
        if not file_path.exists() or not file_path.is_file():
            raise Http404("Sample image not found")
        return FileResponse(open(file_path, "rb"))


class PipelineRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "Image file is required."}, status=status.HTTP_400_BAD_REQUEST)

        route_result = route_medical_image(uploaded_file.read())
        return Response(route_result)


class PipelineAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "Image file is required."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role != User.PATIENT or not hasattr(request.user, "patient"):
            return Response(
                {"error": "Only patients can create scan analyses from the pipeline UI."},
                status=status.HTTP_403_FORBIDDEN,
            )

        scan = Scan(
            patient=request.user.patient,
            image=uploaded_file,
            scan_type=request.data.get("scan_type") or "OTHER",
            title=request.data.get("title") or uploaded_file.name,
            description=request.data.get("description") or "",
        )
        scan._skip_auto_analysis = True
        scan.save()
        scan.run_ai_prediction(force_disease=request.data.get("force_disease"))
        scan.refresh_from_db()

        serializer = ScanSerializer(scan, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
