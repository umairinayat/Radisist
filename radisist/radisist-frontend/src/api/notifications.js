import apiClient from "./apiClient";

export const getNotifications = async ({ unread = false } = {}) => {
  const response = await apiClient.get(`/radiology/notifications/${unread ? "?unread=1" : ""}`);
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await apiClient.get("/radiology/notifications/unread-count/");
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await apiClient.post(`/radiology/notifications/${notificationId}/mark-read/`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.post("/radiology/notifications/mark-all-read/");
  return response.data;
};
