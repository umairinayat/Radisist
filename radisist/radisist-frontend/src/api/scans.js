import apiClient from "./apiClient";

export const uploadScan = async (formData) => {
    try {
        const response = await apiClient.post("/radiology/scans/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error uploading scan:", error);
        throw error;
    }
};

export const getScans = async () => {
    try {
        const response = await apiClient.get("/radiology/scans/");
        return response.data;
    } catch (error) {
        console.error("Error fetching scans:", error);
        throw error;
    }
};

export const getScanDetails = async (id) => {
    try {
        const response = await apiClient.get(`/radiology/scans/${id}/`);
        return response.data;
    } catch (error) {
        console.error("Error fetching scan details:", error);
        throw error;
    }
};

export const acceptScanCase = async (id) => {
    try {
        const response = await apiClient.post(`/radiology/scans/${id}/accept-case/`);
        return response.data;
    } catch (error) {
        console.error("Error accepting scan case:", error);
        throw error;
    }
};
