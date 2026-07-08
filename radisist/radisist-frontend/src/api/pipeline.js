import apiClient from "./apiClient";

export const getPipelineHealth = async () => {
  const response = await apiClient.get("/radiology/pipeline/health/");
  return response.data;
};

export const getPipelineSamples = async (limit = 5) => {
  try {
    const response = await apiClient.get(`/radiology/pipeline/samples/?limit=${limit}`);
    return response.data;
  } catch (error) {
    return {
      diseases: [
        { disease: "mammography", samples: [] },
        { disease: "breast_ultrasound", samples: [] },
        { disease: "thyroid_ultrasound", samples: [] },
        { disease: "endoscopy", samples: [] },
        { disease: "chest_xray", samples: [] },
        { disease: "dermatology", samples: [] }
      ]
    };
  }
};

export const getPipelineModels = async () => {
  const response = await apiClient.get("/radiology/pipeline/models/");
  return response.data;
};

export const routePipelineImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/radiology/pipeline/route/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const analyzePipelineImage = async ({ file, title, description, forceDisease, scanType = "OTHER" }) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title || file.name);
  formData.append("description", description || "");
  formData.append("scan_type", scanType);

  if (forceDisease) {
    formData.append("force_disease", forceDisease);
  }

  const response = await apiClient.post("/radiology/pipeline/analyze/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const savePipelineCrop = async (scanId, { blob, x, y, width, height }) => {
  const formData = new FormData();
  formData.append("image", blob, `scan-${scanId}-crop.png`);
  formData.append("x", String(x));
  formData.append("y", String(y));
  formData.append("width", String(width));
  formData.append("height", String(height));

  const response = await apiClient.post(`/radiology/scans/${scanId}/save-crop/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
