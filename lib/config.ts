// Server-side config. Secrets live in CF Pages env, never shipped to the client.
export const CLOUD_BASE =
  process.env.DEFENDABLE_CLOUD_API_BASE || "https://api.defendablecloud.com";
export const ROUTER_BASE = process.env.DEFENDABLE_ROUTER_API_BASE || "";
export const ROUTER_TOKEN = process.env.DEFENDABLE_ROUTER_TOKEN || "";

export const SESSION_COOKIE = "dash_jwt";
