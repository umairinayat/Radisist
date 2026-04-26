from django.db import transaction
from djoser.serializers import UserCreateSerializer, UserSerializer
from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Radiologist, Patient

User = get_user_model()


class CustomUserCreateSerializer(UserCreateSerializer):
    # Radiologist Fields
    license_id = serializers.CharField(required=False, allow_blank=True)
    hospital = serializers.CharField(required=False, allow_blank=True)

    # Patient Fields
    previous_breast_disease = serializers.CharField(required=False, allow_blank=True)
    family_breast_cancer = serializers.CharField(required=False, allow_blank=True)
    hormonal_therapy = serializers.CharField(required=False, allow_blank=True)
    symptoms = serializers.CharField(required=False, allow_blank=True)
    lifestyle = serializers.CharField(required=False, allow_blank=True)

    class Meta(UserCreateSerializer.Meta):
        model = User
        fields = (
            "id",
            "email",
            "password",
            "full_name",
            "role",
            "gender",
            "age",
            "license_id",
            "hospital",
            "previous_breast_disease",
            "family_breast_cancer",
            "hormonal_therapy",
            "symptoms",
            "lifestyle",
        )

    def create(self, validated_data):
        # Explicitly extract User fields
        user_data = {
            "email": validated_data.get("email"),
            "full_name": validated_data.get("full_name"),
            "role": validated_data.get("role"),
            "gender": validated_data.get("gender"),
            "age": validated_data.get("age"),
        }
        password = validated_data.get("password")

        # Explicitly extract Profile fields
        license_id = validated_data.get("license_id")
        hospital = validated_data.get("hospital", "")

        patient_data = {
            "previous_breast_disease": validated_data.get(
                "previous_breast_disease", ""
            ),
            "family_breast_cancer": validated_data.get("family_breast_cancer", ""),
            "hormonal_therapy": validated_data.get("hormonal_therapy", ""),
            "symptoms": validated_data.get("symptoms", "OTHERS"),
            "lifestyle": validated_data.get("lifestyle", "OTHERS"),
        }

        with transaction.atomic():
            # Manually create user with CLEAN dictionary
            user = User.objects.create_user(password=password, **user_data)

            if user.role == "RADIOLOGIST":
                if not license_id:
                    raise serializers.ValidationError(
                        {"license_id": "This field is required for Radiologists."}
                    )

                Radiologist.objects.create(
                    user=user, license_id=license_id, hospital=hospital
                )

            elif user.role == "PATIENT":
                # Signal might have created it already
                patient, created = Patient.objects.get_or_create(user=user)
                for key, value in patient_data.items():
                    setattr(patient, key, value)
                patient.save()

        return user


class CustomUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "gender",
            "age",
            "is_active",
            "is_staff",
        )


class ManualUserCreateSerializer(serializers.ModelSerializer):
    # Re-implementing fields to ensure control
    password = serializers.CharField(write_only=True)
    license_id = serializers.CharField(required=False, allow_blank=True)
    hospital = serializers.CharField(required=False, allow_blank=True)
    previous_breast_disease = serializers.CharField(required=False, allow_blank=True)
    family_breast_cancer = serializers.CharField(required=False, allow_blank=True)
    hormonal_therapy = serializers.CharField(required=False, allow_blank=True)
    symptoms = serializers.CharField(required=False, allow_blank=True)
    lifestyle = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "full_name",
            "role",
            "gender",
            "age",
            "license_id",
            "hospital",
            "previous_breast_disease",
            "family_breast_cancer",
            "hormonal_therapy",
            "symptoms",
            "lifestyle",
        )

    def create(self, validated_data):
        # Explicitly extract User fields
        user_data = {
            "email": validated_data.get("email"),
            "full_name": validated_data.get("full_name"),
            "role": validated_data.get("role"),
            "gender": validated_data.get("gender"),
            "age": validated_data.get("age"),
        }
        password = validated_data.get("password")

        # Explicitly extract Profile fields
        license_id = validated_data.get("license_id")
        hospital = validated_data.get("hospital", "")

        patient_data = {
            "previous_breast_disease": validated_data.get(
                "previous_breast_disease", ""
            ),
            "family_breast_cancer": validated_data.get("family_breast_cancer", ""),
            "hormonal_therapy": validated_data.get("hormonal_therapy", ""),
            "symptoms": validated_data.get("symptoms", "OTHERS"),
            "lifestyle": validated_data.get("lifestyle", "OTHERS"),
        }

        with transaction.atomic():
            user = User.objects.create_user(password=password, **user_data)

            if user.role == "RADIOLOGIST":
                if not license_id:
                    raise serializers.ValidationError(
                        {"license_id": "This field is required for Radiologists."}
                    )
                Radiologist.objects.create(
                    user=user, license_id=license_id, hospital=hospital
                )

            elif user.role == "PATIENT":
                patient, created = Patient.objects.get_or_create(user=user)
                for key, value in patient_data.items():
                    setattr(patient, key, value)
                patient.save()

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom TokenObtainPairSerializer that accepts email/password directly.
    """

    email = serializers.EmailField(write_only=True)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email") or attrs.get("username")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError(
                {"detail": "Email and password are required"}
            )
        email = email.strip().lower()

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                {"detail": "No active account found with the given credentials"}
            )

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
