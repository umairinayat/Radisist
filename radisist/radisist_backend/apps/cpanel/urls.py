from django.urls import path
from . import views

app_name = "cpanel"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("services/", views.services, name="services"),
    path("services/<str:unit>/<str:action>/", views.service_action_view, name="service_action"),
    path("logs/", views.logs, name="logs"),
    path("deploy/", views.deploy, name="deploy"),
    path("deploy/run/", views.deploy_run, name="deploy_run"),
    path("deploy/clear-lock/", views.deploy_clear_lock, name="deploy_clear_lock"),
    path("deploy/tail/", views.deploy_tail, name="deploy_tail"),
    path("database/", views.database, name="database"),
    path("database/migrate/", views.db_migrate, name="db_migrate"),
    path("database/makemigrations/", views.db_makemigrations, name="db_makemigrations"),
    path("database/backup/", views.db_backup, name="db_backup"),
    path("backups/", views.backups, name="backups"),
    path("backups/create/", views.backup_create, name="backup_create"),
    path("backups/delete/", views.backup_delete, name="backup_delete"),
    path("users/", views.users, name="users"),
    path("users/<int:pk>/toggle-staff/", views.user_toggle_staff, name="user_toggle_staff"),
    path("users/<int:pk>/toggle-active/", views.user_toggle_active, name="user_toggle_active"),
    path("users/<int:pk>/make-superuser/", views.user_make_superuser, name="user_make_superuser"),
    path("scans/", views.scans, name="scans"),
    path("scans/<int:pk>/delete/", views.scan_delete, name="scan_delete"),
]
