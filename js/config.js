/**
 * Public, client-safe configuration.
 *
 * Leave this as null while working with the static demo. Before deployment,
 * replace it with the public HTTPS URL of the FastAPI service, without a
 * trailing slash (for example, "https://deborah-fowler-api.up.railway.app").
 * This file must never contain passwords, Supabase keys, or Brevo API keys.
 */
export const publicConfig = {
  apiBaseUrl: null,
};

export function apiUrl(path) {
  if (!publicConfig.apiBaseUrl) return null;
  return `${publicConfig.apiBaseUrl.replace(/\/$/, "")}${path}`;
}
