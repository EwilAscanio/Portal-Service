import axios from "axios";

const attachResponseMeta = (response) => {
  const { data, status, statusText, headers } = response;

  if (data === undefined || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return Object.assign(data, { status, statusText, headers });
  }

  if (typeof data === "object") {
    return Object.assign(data, { status, statusText, headers });
  }

  return data;
};

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => attachResponseMeta(response),
  (error) => {
    if (error.response) {
      const { status, statusText } = error.response;
      error.status = status;
      error.statusText = statusText;

      if (status === 401) {
        window.location.href = "/login";
      } else if (status === 403) {
        console.error("Acceso denegado");
      } else if (status === 500) {
        console.error("Error del servidor");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Tiempo de espera agotado");
    }
    return Promise.reject(error);
  }
);

export default api;
