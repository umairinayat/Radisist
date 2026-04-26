from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PipelineAnalyzeView,
    PipelineHealthView,
    PipelineModelsView,
    PipelineRouteView,
    PipelineSampleImageView,
    PipelineSamplesView,
    ReportViewSet,
    ScanViewSet,
)

router = DefaultRouter()
router.register(r'scans', ScanViewSet, basename='scan')
router.register(r'reports', ReportViewSet, basename='report')

urlpatterns = [
    path('pipeline/health/', PipelineHealthView.as_view(), name='pipeline-health'),
    path('pipeline/models/', PipelineModelsView.as_view(), name='pipeline-models'),
    path('pipeline/samples/', PipelineSamplesView.as_view(), name='pipeline-samples'),
    path('pipeline/samples/<str:disease>/<str:filename>/', PipelineSampleImageView.as_view(), name='pipeline-sample-image'),
    path('pipeline/route/', PipelineRouteView.as_view(), name='pipeline-route'),
    path('pipeline/analyze/', PipelineAnalyzeView.as_view(), name='pipeline-analyze'),
    path('', include(router.urls)),
]
