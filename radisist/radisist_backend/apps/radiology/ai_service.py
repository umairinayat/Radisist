import os
import requests
from django.conf import settings

# Configuration matches the training script
CONFIG = {
    'default_model': 'resnet50' 
}

class AIService:
    _instance = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AIService()
        return cls._instance

    def predict(self, image_path, model_name=None):
        """
        Runs prediction on the given image path by calling the external AI Service.
        Returns a dictionary with results.
        """
        if model_name is None:
            model_name = CONFIG['default_model']
            
        service_url = getattr(settings, 'AI_SERVICE_URL', None)
        if not service_url:
            print("AI_SERVICE_URL is not configured.")
            return None

        # Ensure the URL ends with /predict
        if not service_url.endswith('/predict'):
             # Handle cases where user provides base URL without trailing slash
             if not service_url.endswith('/'):
                 service_url += '/'
             service_url += 'predict'

        try:
            with open(image_path, 'rb') as f:
                files = {'file': f}
                params = {'model_name': model_name}
                
                response = requests.post(service_url, files=files, params=params, timeout=30)
                
                if response.status_code == 200:
                    return response.json()
                else:
                    print(f"AI Service Error: {response.status_code} - {response.text}")
                    return None
                    
        except requests.exceptions.RequestException as e:
            print(f"Connection error to AI Service: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error in AI Service: {e}")
            return None

# Global instance for easy access
ai_service = AIService.get_instance()
