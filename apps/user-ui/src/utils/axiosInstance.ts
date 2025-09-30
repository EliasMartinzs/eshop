import axios from 'axios';

const axiosInstace = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URI,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

// Handle logou and prevent infinite loops
const handleLoggout = () => {
  if (window.location.pathname !== '/login') {
    window.location.href = 'login';
  }
};

// Handle adding a new access token to queued requests
const subscribeTokenRefresh = (callback: () => void) => {
  refreshSubscribers.push(callback);
};

// Execute queued requests after refresh
const onRefreshSuccess = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

// Handle API requests
axiosInstace.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Handle expired tokens and refresh loginc
axiosInstace.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // prevent infinite retry loop
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            subscribeTokenRefresh(() => resolve(axiosInstace(originalRequest)));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_URI}/api/refresh-token-user`,
          {},
          { withCredentials: true }
        );

        isRefreshing = false;
        onRefreshSuccess();

        return axiosInstace(originalRequest);
      } catch (error) {
        isRefreshing = false;
        refreshSubscribers = [];
        handleLoggout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstace;
