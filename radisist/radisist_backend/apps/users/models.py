from django.contrib.auth.models import AbstractUser
from django.db import models
from .managers import UserManager

class User(AbstractUser):
    # Remove username — we want email authentication
    username = None
    first_name = None
    last_name = None
    full_name = models.CharField(max_length=256)
    email = models.EmailField(unique=True, null=False, blank=False)
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    # Gender Choices
    GENDER_CHOICES = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    ]

    gender = models.CharField(max_length=50, choices=GENDER_CHOICES)
    age = models.IntegerField(null=True, blank=True)

    # Role choices
    PATIENT = "PATIENT"
    RADIOLOGIST = "RADIOLOGIST"
    ADMIN = "ADMIN"

    ROLE_CHOICES = [
        (PATIENT, "Patient"),
        (RADIOLOGIST, "Radiologist"),
        (ADMIN, "Admin"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=PATIENT)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # No username required

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class Patient(models.Model):
    sypmtoms_options = [
        ("LUMP", "Lump"),
        ("NIPPLE_DISCHARGE","Nipple discharge"),
        ("PAIN","Pain"),
        ("OTHERS","Others")
    ]
    
    lifestyle_options = [
        ("SMOKING", "Smoking"),
        ("ALCOHOL","Alcohol"),
        ("SEDENTARY","Sedentary"),
        ("ACTIVE","Active"),
        ("OTHERS","Others")
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    previous_breast_disease = models.CharField(max_length=300, blank=True)
    family_breast_cancer = models.CharField(max_length=300, blank=True)
    hormonal_therapy = models.CharField(max_length=300, blank=True)
    symptoms = models.CharField(max_length=300, blank=True, choices=sypmtoms_options, default="OTHERS")
    lifestyle = models.CharField(max_length=300, blank=True, choices=lifestyle_options, default="OTHERS")



    def __str__(self):
        return f"PAT-{self.user.id} {self.user.full_name}"


class Radiologist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    license_id = models.CharField(max_length=150, unique=True, null=False, blank=False)
    hospital = models.CharField(max_length=300, blank=True)

    def __str__(self):
        return f"RAD-{self.user.id} {self.user.full_name}"
