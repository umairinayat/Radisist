from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

from django.db.backends.signals import connection_created

def _sqlite_wal(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        connection.cursor().execute("PRAGMA journal_mode=WAL;")
        connection.cursor().execute("PRAGMA synchronous=NORMAL;")

connection_created.connect(_sqlite_wal)


def env_list(name, default=""):
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]

BASE_DIR = Path(__file__).resolve().parent.parent

# Security Settings
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "false").lower() in {"1", "true", "yes", "on"}
ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "127.0.0.1,localhost")

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:7005,http://localhost:7005,http://127.0.0.1:7500,http://localhost:7500",
)
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://127.0.0.1:7005,http://localhost:7005,http://127.0.0.1:7500,http://localhost:7500",
)

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_CREDENTIALS = True
else:
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_ALL_ORIGINS = False


# Application definition

INSTALLED_APPS = [
    "apps.users.apps.UsersConfig",  # Custom User Class for Auth
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "djoser",
    "apps.radiology.apps.RadiologyConfig",
    "apps.cpanel.apps.CpanelConfig",
]

# Linking Default Auth Model to my Custom User Manager
AUTH_USER_MODEL = "users.User"

# Middleware Settings
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # 'whitenoise.middleware.WhiteNoiseMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

# Send @login_required views (e.g. the cPanel) to the Django admin login.
LOGIN_URL = "/admin/login/"
LOGIN_REDIRECT_URL = "/cpanel/"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# Authentication Backends - Enable email-based authentication
AUTHENTICATION_BACKENDS = [
    "apps.users.backends.EmailBackend",  # Custom email authentication
    "django.contrib.auth.backends.ModelBackend",  # Default backend as fallback
]

# Database Settings

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
        conn_health_checks=True,
        ssl_require=not DEBUG,
    )
}

if "sqlite" not in DATABASES["default"]["ENGINE"]:
    DATABASES["default"]["OPTIONS"] = {
        "prepared_threshold": None,
    }
else:
    DATABASES["default"]["OPTIONS"] = {
        "timeout": 30,
    }

DATABASES["default"]["ATOMIC_REQUESTS"] = "sqlite" not in DATABASES["default"]["ENGINE"]

# CRITICAL: For Supabase Transaction Mode compatibility
if "sqlite" not in DATABASES["default"]["ENGINE"]:
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True


# Password Validation Settings

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Karachi"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# AI Service Configuration
AI_SERVICE_URL = os.getenv(
    "AI_SERVICE_URL", "https://huggingface.co/spaces/example/radiology-ai"
)  # Update with actual URL

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# DRF Settings

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        # Most views will require authentication by default
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        # Most views will require authentication by default
        "rest_framework.renderers.JSONRenderer",
    ),
}

SIMPLE_JWT = {
    # Set token expiration to 5 minutes (standard industry practice)
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CustomTokenObtainPairSerializer",
    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),  # Tokens are sent as "Authorization: Bearer <token>"
}

DJOSER = {
    "LOGIN_FIELD": "email",
    "USER_CREATE_PASSWORD_RETYPE": True,
    "USERNAME_CHANGED_EMAIL_CONFIRMATION": True,
    "PASSWORD_CHANGED_EMAIL_CONFIRMATION": True,
    "SEND_CONFIRMATION_EMAIL": True,
    "SET_USERNAME_RETYPE": True,
    "SET_PASSWORD_RETYPE": True,
    "PASSWORD_RESET_CONFIRM_URL": "password/reset/confirm/{uid}/{token}",
    "USERNAME_RESET_CONFIRM_URL": "email/reset/confirm/{uid}/{token}",
    "ACTIVATION_URL": "activate/{uid}/{token}",
    "SEND_ACTIVATION_EMAIL": True,
    "SERIALIZERS": {
        "user_create": "apps.users.serializers.ManualUserCreateSerializer",
        "user_create_password_retype": "apps.users.serializers.ManualUserCreateSerializer",
        "user": "apps.users.serializers.CustomUserSerializer",
        "current_user": "apps.users.serializers.CustomUserSerializer",
        "user_delete": "djoser.serializers.UserDeleteSerializer",
    },
    "EMAIL": {
        "activation": "djoser.email.ActivationEmail",
        "confirmation": "djoser.email.ConfirmationEmail",
        "password_reset": "djoser.email.PasswordResetEmail",
        "password_changed_confirmation": "djoser.email.PasswordChangedConfirmationEmail",
    },
    "PERMISSIONS": {
        "user_create": ["rest_framework.permissions.AllowAny"],
        "user": ["djoser.permissions.CurrentUserOrAdmin"],
        "user_list": ["djoser.permissions.CurrentUserOrAdmin"],
    },
}

# Domain and Site Name for Email Links
DOMAIN = os.getenv("DOMAIN", "127.0.0.1:7005")
SITE_NAME = os.getenv("SITE_NAME", "Radisist")

# Email Settings
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
