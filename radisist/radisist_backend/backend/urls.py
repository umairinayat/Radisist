from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from rest_framework_simplejwt.views import TokenBlacklistView


def root_view(request):
    return HttpResponse(
        """
        <html>
          <head><title>Radisist Django API</title></head>
          <body style="font-family: Arial, sans-serif; padding: 32px; line-height: 1.6;">
            <h1>Radisist Django API</h1>
            <p>The Django backend is running.</p>
            <ul>
              <li><a href="/api/radiology/pipeline/health/">Pipeline Health</a></li>
              <li><a href="/api/radiology/pipeline/samples/">Pipeline Samples</a></li>
              <li><a href="/admin/">Admin</a></li>
            </ul>
          </body>
        </html>
        """
    )


urlpatterns = [
    path("", root_view),
    path("admin/", admin.site.urls),
    path("api/auth/", include("djoser.urls")),
    path("api/auth/", include("djoser.urls.jwt")),
    path("api/radiology/", include("apps.radiology.urls")),
    path("api/auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
