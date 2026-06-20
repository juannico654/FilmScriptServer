const rawApiUrl = String(import.meta.env.VITE_API_URL || "").trim();

const normalizeApiBase = (value) => {
  if (!value) return "http://localhost:5000";

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  return withProtocol.replace(/\/+$/, "");
};

const API_BASE = normalizeApiBase(rawApiUrl);

export default API_BASE;
