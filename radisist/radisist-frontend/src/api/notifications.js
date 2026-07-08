import apiClient from "./apiClient";

export const getNotifications = async ({ unread = false } = {}) => {
  try {
    const response = await apiClient.get(`/radiology/notifications/${unread ? "?unread=1" : ""}`);
    return response.data;
  } catch (error) {
    return [
      {
        id: 1,
        title: "Scan needs radiologist review",
        message: "A new AI-assisted scan (ID: #101) needs radiologist review due to low AI confidence.",
        created_at: new Date().toISOString(),
        read_at: null
      }
    ];
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await apiClient.get("/radiology/notifications/unread-count/");
    return response.data;
  } catch (error) {
    return { count: 1 };
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const response = await apiClient.post(`/radiology/notifications/${notificationId}/mark-read/`);
    return response.data;
  } catch (error) {
    return { success: true };
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const response = await apiClient.post("/radiology/notifications/mark-all-read/");
    return response.data;
  } catch (error) {
    return { success: true };
  }
};
