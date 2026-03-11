const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export function buildApiUrl(path = "") {
  if (!path) return API_BASE_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}