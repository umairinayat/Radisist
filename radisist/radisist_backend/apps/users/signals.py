from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Patient

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.role == "PATIENT":
            Patient.objects.get_or_create(user=instance)
        # Radiologist profile is handled in the Serializer due to extra field requirements
