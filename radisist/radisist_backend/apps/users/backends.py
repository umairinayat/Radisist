from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Custom authentication backend that authenticates using email instead of username.
    This allows JWT token generation via email/password login.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Accept either username or email key and normalize input.
        email = kwargs.get("email") or username
        if not email or not password:
            return None
        email = email.strip().lower()

        try:
            # Use case-insensitive email matching to avoid client casing issues.
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return None

        # Check password and ensure user is active
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
