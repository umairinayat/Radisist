from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Patient, Radiologist
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "full_name", "role", "gender", "age")

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = ("email", "full_name", "role", "gender", "age","is_active","is_staff")

class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm

    ordering = ("email",)
    list_display = ("email", "full_name", "role", "is_active", "is_staff")
    search_fields = ("email", "full_name")
    list_filter = ("role", "is_active", "is_staff")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "gender", "age", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "full_name", "role", "gender", "age"),
        }),
    )

class PatientAdmin(admin.ModelAdmin):
    list_display = ("user", "symptoms", "lifestyle", "previous_breast_disease", "family_breast_cancer", "hormonal_therapy")
    search_fields = ("user__email", "user__full_name", "previous_breast_disease", "family_breast_cancer")
    list_filter = ("symptoms", "lifestyle")
    
admin.site.register(User, CustomUserAdmin)
admin.site.register(Patient, PatientAdmin)
admin.site.register(Radiologist)
