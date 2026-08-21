from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from . import services as svc
from apps.radiology.models import Scan

User = get_user_model()


def _is_superuser(user) -> bool:
    return user.is_authenticated and user.is_active and user.is_superuser


superuser_required = user_passes_test(_is_superuser)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def dashboard(request: HttpRequest) -> HttpResponse:
    services = svc.all_services()
    git = svc.git_status()
    backups = svc.list_backups()[:5]
    context = {
        "section": "dashboard",
        "services": services,
        "git": git,
        "recent_backups": backups,
        "scan_count": Scan.objects.count(),
        "user_count": User.objects.count(),
    }
    return render(request, "cpanel/dashboard.html", context)


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def services(request: HttpRequest) -> HttpResponse:
    return render(request, "cpanel/services.html", {
        "section": "services",
        "services": svc.all_services(),
    })


@login_required
@superuser_required
@require_POST
def service_action_view(request: HttpRequest, unit: str, action: str) -> HttpResponse:
    try:
        msg = svc.service_action(unit, action)
        messages.success(request, msg)
    except svc.SafeError as e:
        messages.error(request, str(e))
    return render(request, "cpanel/services.html", {
        "section": "services",
        "services": svc.all_services(),
        "action_msg": msg if 'msg' in dir() else None,
    })


# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def logs(request: HttpRequest) -> HttpResponse:
    selected = request.GET.get("log", "redeploy")
    lines = int(request.GET.get("lines", 300))
    content = ""
    error = None
    try:
        content = svc.read_log(selected, lines=lines)
    except svc.SafeError as e:
        error = str(e)
    return render(request, "cpanel/logs.html", {
        "section": "logs",
        "logs": svc.log_choices(),
        "selected": selected,
        "lines": lines,
        "content": content,
        "error": error,
    })


# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def deploy(request: HttpRequest) -> HttpResponse:
    status = svc.deploy_status()
    git = svc.git_status()
    return render(request, "cpanel/deploy.html", {
        "section": "deploy",
        "status": status,
        "git": git,
    })


@login_required
@superuser_required
@require_POST
def deploy_run(request: HttpRequest) -> HttpResponse:
    try:
        msg = svc.run_redeploy()
        messages.success(request, msg)
    except svc.SafeError as e:
        messages.error(request, str(e))
    status = svc.deploy_status()
    git = svc.git_status()
    return render(request, "cpanel/deploy.html", {
        "section": "deploy",
        "status": status,
        "git": git,
    })


@login_required
@superuser_required
@require_POST
def deploy_clear_lock(request: HttpRequest) -> HttpResponse:
    messages.success(request, svc.clear_deploy_lock())
    return render(request, "cpanel/deploy.html", {
        "section": "deploy",
        "status": svc.deploy_status(),
        "git": svc.git_status(),
    })


@login_required
@superuser_required
def deploy_tail(request: HttpRequest) -> HttpResponse:
    return HttpResponse(svc.deploy_status()["tail"], content_type="text/plain")


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def database(request: HttpRequest) -> HttpResponse:
    mig = svc.migration_status()
    return render(request, "cpanel/database.html", {
        "section": "database",
        "migrations": mig,
    })


@login_required
@superuser_required
@require_POST
def db_migrate(request: HttpRequest) -> HttpResponse:
    messages.success(request, "migrate output:\n" + svc.run_migrate())
    return render(request, "cpanel/database.html", {
        "section": "database",
        "migrations": svc.migration_status(),
    })


@login_required
@superuser_required
@require_POST
def db_makemigrations(request: HttpRequest) -> HttpResponse:
    messages.success(request, "makemigrations output:\n" + svc.run_makemigrations())
    return render(request, "cpanel/database.html", {
        "section": "database",
        "migrations": svc.migration_status(),
    })


@login_required
@superuser_required
@require_POST
def db_backup(request: HttpRequest) -> HttpResponse:
    messages.success(request, "backup output:\n" + svc.run_backup())
    return render(request, "cpanel/database.html", {
        "section": "database",
        "migrations": svc.migration_status(),
    })


# ---------------------------------------------------------------------------
# Backups
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def backups(request: HttpRequest) -> HttpResponse:
    return render(request, "cpanel/backups.html", {
        "section": "backups",
        "backups": svc.list_backups(),
    })


@login_required
@superuser_required
@require_POST
def backup_create(request: HttpRequest) -> HttpResponse:
    messages.success(request, "backup output:\n" + svc.run_backup())
    return render(request, "cpanel/backups.html", {
        "section": "backups",
        "backups": svc.list_backups(),
    })


@login_required
@superuser_required
@require_POST
def backup_delete(request: HttpRequest) -> HttpResponse:
    path = request.POST.get("path", "")
    try:
        messages.success(request, svc.delete_backup(path))
    except svc.SafeError as e:
        messages.error(request, str(e))
    return render(request, "cpanel/backups.html", {
        "section": "backups",
        "backups": svc.list_backups(),
    })


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def users(request: HttpRequest) -> HttpResponse:
    qs = User.objects.all().order_by("-date_joined")
    return render(request, "cpanel/users.html", {
        "section": "users",
        "users": qs,
    })


def _user_flag_view(request, pk, attr, label):
    u = User.objects.filter(pk=pk).first()
    if u is None:
        messages.error(request, "User not found.")
        return render(request, "cpanel/users.html", {
            "section": "users",
            "users": User.objects.all().order_by("-date_joined"),
        })
    # prevent self-demotion edge cases
    if attr == "is_superuser" and u.pk == request.user.pk and not request.POST.get("confirm_self"):
        messages.error(request, "Refusing to remove your own superuser flag (you'd lock yourself out).")
    else:
        setattr(u, attr, not getattr(u, attr))
        u.save(update_fields=[attr])
        messages.success(request, f"{u.email}: {label} -> {'on' if getattr(u, attr) else 'off'}")
    return render(request, "cpanel/users.html", {
        "section": "users",
        "users": User.objects.all().order_by("-date_joined"),
    })


@login_required
@superuser_required
@require_POST
def user_toggle_staff(request, pk):
    return _user_flag_view(request, pk, "is_staff", "staff")


@login_required
@superuser_required
@require_POST
def user_toggle_active(request, pk):
    return _user_flag_view(request, pk, "is_active", "active")


@login_required
@superuser_required
@require_POST
def user_make_superuser(request, pk):
    return _user_flag_view(request, pk, "is_superuser", "superuser")


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------

@login_required
@superuser_required
def scans(request: HttpRequest) -> HttpResponse:
    qs = Scan.objects.all().select_related("patient", "patient__user").order_by("-created_at")[:200]
    return render(request, "cpanel/scans.html", {
        "section": "scans",
        "scans": qs,
    })


@login_required
@superuser_required
@require_POST
def scan_delete(request, pk):
    s = Scan.objects.filter(pk=pk).first()
    if s is None:
        messages.error(request, "Scan not found.")
    else:
        # delete image file too
        try:
            if s.image and s.image.path:
                import os
                if os.path.exists(s.image.path):
                    os.remove(s.image.path)
        except Exception:
            pass
        s.delete()
        messages.success(request, f"Scan #{pk} deleted.")
    qs = Scan.objects.all().select_related("patient", "patient__user").order_by("-created_at")[:200]
    return render(request, "cpanel/scans.html", {
        "section": "scans",
        "scans": qs,
    })
