import apiClient from "./apiClient";

export const registerUser = async (data) => {
    const response = await apiClient.post("/auth/users/", data);
    return response.data;
};

export const activateUser = async (uid, token) => {
    const response = await apiClient.post("/auth/users/activation/", { uid, token });
    return response.data;
};
