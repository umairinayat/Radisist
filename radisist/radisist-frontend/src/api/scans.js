import apiClient from "./apiClient";

export const uploadScan = async (formData) => {
    const response = await apiClient.post("/radiology/scans/", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const getScans = async () => {
    const response = await apiClient.get("/radiology/scans/");
    return response.data;
};

export const getScanDetails = async (id) => {
    const response = await apiClient.get(`/radiology/scans/${id}/`);
    return response.data;
};

export const acceptScanCase = async (id) => {
    const response = await apiClient.post(`/radiology/scans/${id}/accept-case/`);
    return response.data;
};

export const requestScanReview = async (id) => {
    const response = await apiClient.post(`/radiology/scans/${id}/request-review/`);
    return response.data;
};
