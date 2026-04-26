from django.http import FileResponse, Http404
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Scan, Report, ScanCrop
from .pipeline_service import get_pipeline_models, get_sample_gallery, route_medical_image
from .serializers import ScanCropSerializer, ScanSerializer, ReportSerializer
from apps.users.models import User

class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.PATIENT

class IsRadiologist(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.RADIOLOGIST

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
