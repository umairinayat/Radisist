import apiClient from "./apiClient";

export const updateReport = async (reportId, payload) => {
  const response = await apiClient.patch(`/radiology/reports/${reportId}/`, payload);
  return response.data;
};

export const finalizeReport = async (reportId, payload) => {
  const response = await apiClient.post(`/radiology/reports/${reportId}/finalize/`, payload);
  return response.data;
};

export const exportReportPdf = async (reportId) => {
  const response = await apiClient.get(`/radiology/reports/${reportId}/export-pdf/`, {
    responseType: "blob",
  });
  return response.data;
};
