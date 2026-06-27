import axios from "axios";

const baseURL = import.meta.env.VITE_DJANGO_API_BASE || "/api";

const apiClient = axios.create({
    baseURL,
});

// Request Interceptor
apiClient.interceptors.request.use((config) => {
    // Only skip token for Registration (POST /auth/users/) and Activation
    // Note: We MUST send token for /auth/users/me/ (GET /auth/users/me/)
    const isRegistration = config.url === "/auth/users/" && config.method === "post";
    const isActivation = config.url.includes("/auth/users/activation/");
    const isLogin = config.url.includes("/auth/jwt/create/");

    if (isRegistration || isActivation || isLogin) {
        return config;
    }

    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor for Token Refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refresh = localStorage.getItem("refresh_token");

            if (refresh) {
                try {
                    // We use basic axios call relative to baseURL if possible, or just apiClient itself with a flag to avoid recursion
                    const resp = await axios.post(`${apiClient.defaults.baseURL}/auth/jwt/refresh/`, { refresh });
                    const newAccess = resp.data.access;


                    localStorage.setItem("access_token", newAccess);
                    apiClient.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
                    originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    // Only clear and redirect if it's a legitimate refresh failure (e.g. 401/403)
                    if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
                        localStorage.clear();
                        window.location.href = "/login";
                    }
                }
            } else {
                localStorage.clear();
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
