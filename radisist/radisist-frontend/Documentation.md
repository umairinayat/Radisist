# Radisist API Documentation

**Base URL**: `/api/`
**Content-Type**: `application/json` (unless specified otherwise)

---

## 🔐 Authentication

Implements JWT (JSON Web Token) authentication via Djoser.

### 1. Register User

**Endpoint**: `POST /auth/users/`  
**Description**: Register a new user (Patient or Radiologist).

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | string | **Yes** | Valid email address. Used as username. |
| `password` | string | **Yes** | Strong password. |
| `re_password` | string | **Yes** | Must match `password`. |
| `full_name` | string | **Yes** | Full name of the user. |
| `role` | string | **Yes** | `PATIENT` or `RADIOLOGIST`. |
| `gender` | string | **Yes** | `MALE`, `FEMALE`, or `OTHER`. |
| [age](file:///d:/UMT/FYP/Project/radisist_backend/apps/radiology/ai_service.py#83-94) | integer | **Yes** | Age of the user. |
| `license_id` | string | **Cond** | Required if role is `RADIOLOGIST`. |
| `hospital` | string | No | Hospital name (Radiologist only). |
| `previous_breast_disease` | string | No | Medical history (Patient only). |
| `family_breast_cancer` | string | No | Family history (Patient only). |
| `hormonal_therapy` | string | No | Therapy history (Patient only). |
| `symptoms` | string | No | `LUMP`, `PAIN`, etc. (Patient only). |
| `lifestyle` | string | No | `SMOKING`, `ACTIVE`, etc. (Patient only). |

#### Example Request
```json
{
    "email": "med_expert@hospital.com",
    "password": "StrongPassword123!",
    "re_password": "StrongPassword123!",
    "full_name": "Dr. Smith",
    "role": "RADIOLOGIST",
    "gender": "MALE",
    "age": 45,
    "license_id": "RAD-987654",
    "hospital": "City General"
}
```

#### Responses
*   **201 Created**: User successfully registered.
*   **400 Bad Request**: Validation errors (e.g., passwords don't match, email exists).

---

### 2. Login (Get Token)

**Endpoint**: `POST /auth/jwt/create/`

#### Request Body
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

#### Response (200 OK)
```json
{
    "access": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5..."
}
```

### 3. Verification & Refresh
*   **Verify Token**: `POST /auth/jwt/verify/` (`{"token": "access_token"}`)
*   **Refresh Token**: `POST /auth/jwt/refresh/` (`{"refresh": "refresh_token"}`)

---

## 🏥 Radiology (App)

**Headers**: `Authorization: Bearer <your_access_token>`

### 1. Upload Scan

**Endpoint**: `POST /radiology/scans/`  
**Content-Type**: `multipart/form-data`  
**Description**: Upload a medical scan image. **Automatically triggers AI Analysis.**

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [image](file:///d:/UMT/FYP/Project/radisist_backend/apps/radiology/ai_service.py#83-94) | File | **Yes** | Image file (JPG, PNG). |
| `scan_type` | string | **Yes** | `MRI`, `CT`, `XRAY`, `MAMMOGRAM`, or `OTHER`. |
| `title` | string | No | Short title/label for the scan. |
| `description` | string | No | Additional notes. |

#### Response (201 Created)
```json
{
    "id": 1,
    "patient_name": "Jane Doe",
    "image": "http://localhost:8000/media/scans/2026/01/04/scan.png",
    "scan_type": "MAMMOGRAM",
    "title": "Checkup",
    "description": "",
    "created_at": "2026-01-04T12:00:00Z",
    "ai_generated": true,
    "ai_predicted_class": "Benign",
    "ai_confidence": 98.5,
    "ai_benign_prob": 98.5,
    "ai_malignant_prob": 1.5,
    "report": {
        "id": 10,
        "impression": "AI Prediction: Benign (98.5%)",
        "is_final": false
    }
}
```

---

### 2. List Scans

**Endpoint**: `GET /radiology/scans/`  
**Permissions**:
*   **Patients**: View only *their own* scans.
*   **Radiologists**: View *all* scans.

#### Query Parameters
*   `search`: Filter by `title`, `description`, or `patient name`.  
    *   *Example*: `/radiology/scans/?search=Brain`

#### Response (200 OK)
```json
[
    {
        "id": 1,
        "patient_name": "Jane Doe",
        "image": "...",
        "scan_type": "MRI",
        "ai_predicted_class": "Malignant",
        "created_at": "..."
    }
]
```

---

### 3. Get Scan Details

**Endpoint**: `GET /radiology/scans/{id}/`

#### Response (200 OK)
Returns full scan details including the nested **Report**.

---

### 4. Update Report (Radiologist Only)

**Endpoint**: `PATCH /radiology/reports/{id}/`  
**Permissions**: **Radiologist Only**.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `content` | string | No | The full detailed medical text. |
| `impression` | string | No | Summary/Conclusion. |
| `is_final` | boolean | No | Mark as `true` to finalize the report. |

#### Example Request
```json
{
    "content": "Detailed analysis showing no calcification...",
    "impression": "Normal findings. No evidence of malignancy.",
    "is_final": true
}
```

#### Response (200 OK)
```json
{
    "id": 15,
    "radiologist_name": "Dr. Smith",
    "content": "Detailed analysis showing no calcification...",
    "impression": "Normal findings. No evidence of malignancy.",
    "is_final": true,
    "updated_at": "2026-01-04T12:30:00Z"
}
```

---

### 5. View Report

**Endpoint**: `GET /radiology/reports/{id}/`

#### Permission Logic
*   **Radiologist**: Receives full response (all fields).
*   **Patient**: Receives response **WITHOUT** the `content` field (only `impression` is visible), unless customized otherwise.

---

### 6. Manual AI Re-run

**Endpoint**: `POST /radiology/scans/{id}/rerun_ai/`  
**Description**: Forces the AI to re-analyze the image and update the linked report.

#### Response (200 OK)
Returns the updated Scan object with new AI scores.
