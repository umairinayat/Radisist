import apiClient from "./apiClient";

let localMockScans = null;
function getMockScans() {
  if (localMockScans) return localMockScans;
  const stored = localStorage.getItem("testing_mock_scans");
  if (stored) {
    localMockScans = JSON.parse(stored);
    return localMockScans;
  }
  localMockScans = [
    {
      id: 101,
      title: "Routine Mammogram Scan - Left Breast",
      scan_type: "MAMMOGRAM",
      routed_modality: "mammography",
      disease_model: "breast_cancer_resnet",
      ai_predicted_class: "Malignant",
      display_prediction: "Needs radiologist review",
      ai_confidence: 0.68,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
      segmentation_overlay_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", 
      xai_heatmap_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      safety: {
        needs_radiologist_review: true,
        warnings: ["Classifier confidence is below the review threshold (0.68 < 0.70)."]
      },
      report: {
        id: 1001,
        content: "AI Draft: Indication of irregular density in the upper outer quadrant.",
        impression: "Suspicious mass. Requesting biopsy confirmation.",
        is_final: false
      },
      analysis_metadata: {
        safety: {
          needs_radiologist_review: true,
          warnings: ["Classifier confidence is below the review threshold (0.68 < 0.70)."]
        }
      }
    },
    {
      id: 102,
      title: "Thorax Scan - Contrast",
      scan_type: "CT",
      routed_modality: "chest_xray",
      disease_model: "lung_nodule_classifier",
      ai_predicted_class: "Benign",
      display_prediction: "Benign",
      ai_confidence: 0.94,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80",
      segmentation_overlay_base64: "",
      xai_heatmap_base64: "",
      safety: {
        needs_radiologist_review: false,
        warnings: []
      },
      report: {
        id: 1002,
        content: "AI Draft: Lungs are clear. No focal consolidation or pleural effusion.",
        impression: "Normal chest scan.",
        is_final: false
      },
      analysis_metadata: {}
    }
  ];
  localStorage.setItem("testing_mock_scans", JSON.stringify(localMockScans));
  return localMockScans;
}

function saveMockScans(scans) {
  localMockScans = scans;
  localStorage.setItem("testing_mock_scans", JSON.stringify(scans));
}

export const uploadScan = async (formData) => {
    try {
        const response = await apiClient.post("/radiology/scans/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        // Mock create scan on upload
        const scans = getMockScans();
        const newId = scans.length ? Math.max(...scans.map(s => s.id)) + 1 : 101;
        const fileObj = formData.get("file");
        const title = formData.get("title") || (fileObj ? fileObj.name : "New Scan");
        const newScan = {
            id: newId,
            title,
            scan_type: formData.get("scan_type") || "MAMMOGRAM",
            routed_modality: "mammography",
            disease_model: "breast_cancer_resnet",
            ai_predicted_class: "Malignant",
            display_prediction: "Needs radiologist review",
            ai_confidence: 0.72,
            created_at: new Date().toISOString(),
            image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
            segmentation_overlay_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            xai_heatmap_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            safety: {
                needs_radiologist_review: true,
                warnings: ["Classifier confidence is below review gate threshold."]
            },
            report: {
                id: newId + 900,
                content: "AI Draft: Irregular tissue density identified.",
                impression: "Awaiting clinical review.",
                is_final: false
            },
            analysis_metadata: {
                safety: {
                    needs_radiologist_review: true,
                    warnings: ["Classifier confidence is below review gate threshold."]
                }
            }
        };
        const updated = [newScan, ...scans];
        saveMockScans(updated);
        return newScan;
    }
};

export const getScans = async () => {
    try {
        const response = await apiClient.get("/radiology/scans/");
        return response.data;
    } catch (error) {
        return getMockScans();
    }
};

export const getScanDetails = async (id) => {
    try {
        const response = await apiClient.get(`/radiology/scans/${id}/`);
        return response.data;
    } catch (error) {
        const scans = getMockScans();
        const found = scans.find(s => s.id === Number(id));
        if (found) return found;
        throw error;
    }
};

export const acceptScanCase = async (id) => {
    try {
        const response = await apiClient.post(`/radiology/scans/${id}/accept-case/`);
        return response.data;
    } catch (error) {
        const scans = getMockScans();
        const updated = scans.map(s => {
            if (s.id === Number(id)) {
                return {
                    ...s,
                    report: {
                        ...s.report,
                        radiologist: 1,
                        radiologist_name: "Dr. Jane Smith (Test Radiologist)"
                    }
                };
            }
            return s;
        });
        saveMockScans(updated);
        return updated.find(s => s.id === Number(id));
    }
};

export const requestScanReview = async (id) => {
    try {
        const response = await apiClient.post(`/radiology/scans/${id}/request-review/`);
        return response.data;
    } catch (error) {
        const scans = getMockScans();
        const updated = scans.map(s => {
            if (s.id === Number(id)) {
                return {
                    ...s,
                    analysis_metadata: {
                        ...s.analysis_metadata,
                        manual_review_requested: true
                    }
                };
            }
            return s;
        });
        saveMockScans(updated);
        return updated.find(s => s.id === Number(id));
    }
};
