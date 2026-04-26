from django.contrib import admin
from .models import Scan

@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'scan_type', 'created_at')
    list_filter = ('scan_type', 'created_at')
    search_fields = ('patient__email', 'scan_type')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
