from django.contrib import admin
from .models import Notification, Report, Scan, ScanCrop

@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'scan_type', 'created_at')
    list_filter = ('scan_type', 'created_at')
    search_fields = ('patient__user__email', 'scan_type')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "scan", "radiologist", "is_final", "updated_at")
    list_filter = ("is_final", "provider", "updated_at")
    search_fields = ("scan__patient__user__email", "impression", "content")


@admin.register(ScanCrop)
class ScanCropAdmin(admin.ModelAdmin):
    list_display = ("id", "scan", "created_at")
    search_fields = ("scan__patient__user__email",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "notification_type", "title", "read_at", "created_at")
    list_filter = ("notification_type", "read_at", "created_at")
    search_fields = ("recipient__email", "title", "message")
