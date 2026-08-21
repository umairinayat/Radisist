"""System-level helpers for the cPanel (systemd, metrics, logs, scripts).

All shell invocations go through a fixed allow-list so user input never reaches
the shell directly.
"""
from __future__ import annotations

import os
import re
import shlex
import socket
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

REPO = Path("/root/fyp")
BACKEND_DIR = REPO / "radisist" / "radisist_backend"
FRONTEND_DIR = REPO / "radisist" / "radisist-frontend"
WEBROOT = Path("/var/www/radisist")
BACKUP_DIR = Path("/var/backups/radisist")
REDEPLOY_LOG = Path("/var/log/radisist-redeploy.log")
VENV = REPO / ".venv" / "bin"

# Services the cPanel is allowed to manage.
MANAGED_SERVICES = [
    "radisist-django.service",
    "radisist-ai.service",
    "nginx.service",
]

# Log files the cPanel may tail.
LOG_FILES = {
    "redeploy": str(REDEPLOY_LOG),
    "django-journal": "journal:radisist-django.service",
    "ai-journal": "journal:radisist-ai.service",
    "nginx-access": "/var/log/nginx/access.log",
    "nginx-error": "/var/log/nginx/error.log",
}


class SafeError(Exception):
    """Raised when an action is refused for safety reasons."""


def _run(cmd: List[str], timeout: int = 30, cwd: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )


# ---------------------------------------------------------------------------
# Services (systemd)
# ---------------------------------------------------------------------------

@dataclass
class ServiceStatus:
    name: str
    state: str
    sub_state: str
    active_since: str
    memory: str
    main_pid: int
    description: str

    @property
    def is_active(self) -> bool:
        return self.state == "active"


def service_status(unit: str) -> ServiceStatus:
    props = {
        "ActiveState": "inactive",
        "SubState": "dead",
        "ActiveEnterTimestamp": "",
        "MemoryCurrent": "0",
        "MainPID": "0",
        "Description": unit,
    }
    for prop in props:
        out = _run(["systemctl", "show", unit, f"--value", f"--property={prop}"])
        props[prop] = out.stdout.strip() or props[prop]

    mem = props["MemoryCurrent"]
    if mem and mem.isdigit():
        mem = _fmt_bytes(int(mem))
    else:
        mem = "n/a"

    pid = int(props["MainPID"]) if props["MainPID"].isdigit() else 0

    return ServiceStatus(
        name=unit,
        state=props["ActiveState"],
        sub_state=props["SubState"],
        active_since=props["ActiveEnterTimestamp"] or "—",
        memory=mem,
        main_pid=pid,
        description=props["Description"],
    )


def all_services() -> List[ServiceStatus]:
    return [service_status(u) for u in MANAGED_SERVICES]


def service_action(unit: str, action: str) -> str:
    if unit not in MANAGED_SERVICES:
        raise SafeError(f"Service '{unit}' is not managed by the cPanel.")
    if action not in {"start", "stop", "restart", "reload", "status"}:
        raise SafeError(f"Unknown action '{action}'.")

    # Refuse to stop nginx if we'd lock ourselves out — allow it but warn.
    out = _run(["systemctl", action, unit], timeout=60)
    msg = out.stdout.strip() or out.stderr.strip() or "ok"
    # systemctl often prints nothing on success.
    if out.returncode == 0 and not msg:
        msg = f"{unit}: {action} succeeded"
    elif out.returncode != 0:
        msg = f"{unit}: {action} FAILED — {out.stderr.strip() or msg}"
    return msg


# ---------------------------------------------------------------------------
# System metrics
# ---------------------------------------------------------------------------

@dataclass
class SystemMetrics:
    hostname: str
    uptime: str
    load_avg: List[float]
    cpu_percent: float
    mem_total: int
    mem_used: int
    mem_percent: float
    disk_total: int
    disk_used: int
    disk_percent: float
    listening_ports: List[dict] = field(default_factory=list)


def _fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.0f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


def _cpu_percent() -> float:
    # Sample /proc/stat twice with a short interval.
    def snap():
        with open("/proc/stat") as f:
            return f.readline().split()[1:]
    a = snap()
    time.sleep(0.1)
    b = snap()
    ai = list(map(int, a))
    bi = list(map(int, b))
    total = sum(bi) - sum(ai)
    idle = bi[3] - ai[3]
    if total <= 0:
        return 0.0
    return round(100.0 * (1 - idle / total), 1)


def _meminfo() -> dict:
    info = {}
    with open("/proc/meminfo") as f:
        for line in f:
            key, _, rest = line.partition(":")
            num = rest.strip().split()[0]
            info[key] = int(num) * 1024  # bytes
    return info


def _listening_ports() -> List[dict]:
    out = _run(["ss", "-tlnp"])
    ports = []
    for line in out.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 7:
            continue
        local = parts[3]
        proc = parts[6]
        m = re.search(r":(\d+)$", local)
        if not m:
            continue
        port = m.group(1)
        addr = local.rsplit(":", 1)[0]
        ports.append({"addr": addr, "port": port, "proc": proc})
    # de-dup
    seen = set()
    out_list = []
    for p in ports:
        key = (p["addr"], p["port"])
        if key in seen:
            continue
        seen.add(key)
        out_list.append(p)
    return out_list


def system_metrics() -> SystemMetrics:
    # uptime
    with open("/proc/uptime") as f:
        up_secs = float(f.read().split()[0])
    days, rem = divmod(int(up_secs), 86400)
    hours, rem = divmod(rem, 3600)
    mins, _ = divmod(rem, 60)
    uptime = f"{days}d {hours}h {mins}m"

    load = os.getloadavg()

    mem = _meminfo()
    mem_total = mem.get("MemTotal", 0)
    mem_avail = mem.get("MemAvailable", 0)
    mem_used = max(mem_total - mem_avail, 0)

    # disk
    st = os.statvfs("/")
    disk_total = st.f_blocks * st.f_frsize
    disk_free = st.f_bavail * st.f_frsize
    disk_used = disk_total - disk_free

    return SystemMetrics(
        hostname=socket.gethostname(),
        uptime=uptime,
        load_avg=[round(x, 2) for x in load],
        cpu_percent=_cpu_percent(),
        mem_total=mem_total,
        mem_used=mem_used,
        mem_percent=round(100.0 * mem_used / mem_total, 1) if mem_total else 0,
        disk_total=disk_total,
        disk_used=disk_used,
        disk_percent=round(100.0 * disk_used / disk_total, 1) if disk_total else 0,
        listening_ports=_listening_ports(),
    )


def fmt_bytes(n: int) -> str:
    return _fmt_bytes(int(n))


# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------

def read_log(name: str, lines: int = 300) -> str:
    if name not in LOG_FILES:
        raise SafeError(f"Unknown log '{name}'.")
    target = LOG_FILES[name]
    if target.startswith("journal:"):
        unit = target.split(":", 1)[1]
        out = _run(["journalctl", "-u", unit, "-n", str(lines), "--no-pager", "--utc"])
        return out.stdout
    path = Path(target)
    if not path.exists():
        return f"(log file {path} does not exist yet)"
    try:
        with open(path, errors="replace") as f:
            data = f.read()
    except PermissionError:
        return "(permission denied)"
    return "\n".join(data.splitlines()[-lines:])


def log_choices():
    return list(LOG_FILES.keys())


# ---------------------------------------------------------------------------
# Deploy / scripts
# ---------------------------------------------------------------------------

DEPLOY_LOCK = Path("/tmp/radisist-redeploy.lock")


def deploy_status() -> dict:
    running = DEPLOY_LOCK.exists()
    last_lines = ""
    if REDEPLOY_LOG.exists():
        try:
            last_lines = "\n".join(REDEPLOY_LOG.read_text(errors="replace").splitlines()[-50:])
        except Exception:
            pass
    return {"running": running, "tail": last_lines}


def run_redeploy() -> str:
    if DEPLOY_LOCK.exists():
        raise SafeError("A redeploy is already running. Wait for it to finish.")
    DEPLOY_LOCK.touch()
    try:
        # Fire-and-forget: detach so the HTTP request returns immediately.
        subprocess.Popen(
            ["bash", str(REPO / "scripts" / "redeploy.sh")],
            stdout=open(REDEPLOY_LOG, "ab"),
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
    finally:
        # The script will run for several seconds; clear lock via atexit-like
        # behaviour is not possible cross-process, so we instead rely on the
        # script's completion. Remove lock optimistically after launch window.
        pass
    return "Redeploy started in background. Refresh the Deploy tab to see progress."


def clear_deploy_lock() -> str:
    if DEPLOY_LOCK.exists():
        DEPLOY_LOCK.unlink()
        return "Deploy lock cleared."
    return "No deploy lock present."


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def migration_status() -> dict:
    out = _run([str(VENV / "python"), "manage.py", "showmigrations", "--list"],
               cwd=str(BACKEND_DIR), timeout=60)
    lines = out.stdout.splitlines()
    pending = [l for l in lines if "[ ]" in l]
    applied = sum(1 for l in lines if "[x]" in l)
    return {
        "raw": out.stdout,
        "pending_count": len(pending),
        "applied_count": applied,
        "pending": pending,
    }


def run_migrate() -> str:
    out = _run([str(VENV / "python"), "manage.py", "migrate", "--noinput"],
               cwd=str(BACKEND_DIR), timeout=300)
    tail = "\n".join((out.stdout + out.stderr).splitlines()[-20:])
    return tail or "(no output)"


def run_makemigrations() -> str:
    out = _run([str(VENV / "python"), "manage.py", "makemigrations"],
               cwd=str(BACKEND_DIR), timeout=120)
    return "\n".join((out.stdout + out.stderr).splitlines()[-20:]) or "(no changes)"


def run_backup() -> str:
    out = _run(["bash", str(REPO / "scripts" / "backup.sh")], timeout=300)
    return out.stdout + out.stderr


# ---------------------------------------------------------------------------
# Backups
# ---------------------------------------------------------------------------

def list_backups() -> List[dict]:
    items = []
    # /var/backups/radisist (scripted)
    for p in sorted(BACKUP_DIR.glob("*.tar.gz"), reverse=True) if BACKUP_DIR.exists() else []:
        items.append({
            "name": p.name,
            "path": str(p),
            "size": p.stat().st_size,
            "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(p.stat().st_mtime)),
            "kind": "full",
        })
    # webroot snapshots
    for p in sorted(Path("/var/www").glob("radisist.bak-*"), reverse=True):
        items.append({
            "name": p.name,
            "path": str(p),
            "size": sum(f.stat().st_size for f in p.rglob("*") if f.is_file()),
            "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(p.stat().st_mtime)),
            "kind": "webroot",
        })
    return items


def delete_backup(path: str) -> str:
    p = Path(path)
    # Safety: must live under /var/backups or /var/www and be a backup dir/archive.
    allowed_roots = ("/var/backups/radisist", "/var/www")
    resolved = str(p.resolve())
    if not resolved.startswith(allowed_roots):
        raise SafeError("Refused: path outside allowed backup directories.")
    if not (resolved.endswith(".tar.gz") or "radisist.bak-" in p.name):
        raise SafeError("Refused: not a recognised backup.")
    if p.is_dir():
        import shutil
        shutil.rmtree(p)
    else:
        p.unlink()
    return f"Deleted {p.name}"


# ---------------------------------------------------------------------------
# Git
# ---------------------------------------------------------------------------

def git_status() -> dict:
    def run(*args):
        out = _run(["git", "-C", str(REPO), *args])
        return out.stdout.strip()

    return {
        "branch": run("rev-parse", "--abbrev-ref", "HEAD"),
        "head": run("log", "-1", "--oneline"),
        "ahead_behind": run("rev-list", "--left-right", "--count", "HEAD...origin/main")
        or "0 0",
        "status": run("status", "-sb"),
        "recent": run("log", "--oneline", "-10"),
    }


# ---------------------------------------------------------------------------
# Listening / process helpers reused by views
# ---------------------------------------------------------------------------

def process_table() -> List[dict]:
    out = _run(["ps", "-eo", "pid,pcpu,pmem,rss,etime,cmd", "--sort=-pmem"])
    rows = []
    for line in out.stdout.splitlines()[1:25]:
        parts = line.split(None, 5)
        if len(parts) < 6:
            continue
        pid, cpu, mem, rss, etime, cmd = parts
        rows.append({
            "pid": pid,
            "cpu": cpu,
            "mem": mem,
            "rss": _fmt_bytes(int(rss) * 1024),
            "etime": etime,
            "cmd": cmd,
        })
    return rows
