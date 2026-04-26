from django.shortcuts import render
from djoser.views import UserViewSet
from rest_framework.permissions import AllowAny

class CustomUserViewSet(UserViewSet):
    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()
