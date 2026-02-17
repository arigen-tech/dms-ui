// apiClient.js
import axios from "axios";
import { API_HOST } from "./apiConfig";
import { getAccessToken, getRefreshToken, getDeviceId, clearAuth } from "./auth";

const apiClient = axios.create({
  baseURL: API_HOST,
});

/* ================= REQUEST ================= */
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  const deviceId = getDeviceId();

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (deviceId) config.headers["X-Device-Id"] = deviceId;

  return config;
});

/* ================= RESPONSE ================= */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_HOST}/auth/refresh`, {
          refreshToken: getRefreshToken(),
          deviceId: getDeviceId(),
        });

        const newToken = res.data.token;
        localStorage.setItem("tokenKey", newToken);
        if (res.data.refreshToken) {
          localStorage.setItem("refreshToken", res.data.refreshToken);
        }

        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(original);
      } catch (err) {
        processQueue(err, null);
        clearAuth();
        // window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Standalone function to fetch employee image
export const getEmployeeImage = async (employeeId, extraHeaders = {}) => {
  try {
    const response = await apiClient.get(`/employee/getImageSrc/${employeeId}`, {
      headers: { ...extraHeaders },
      responseType: "arraybuffer", // important for binary
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching employee image:", error);
    throw error;
  }
};

export default apiClient;
