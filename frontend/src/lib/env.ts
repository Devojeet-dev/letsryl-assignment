/**
 * Build-time configuration. `VITE_API_URL` points at the API origin (no path);
 * the versioned prefix is appended here so every caller shares one contract.
 */
const apiOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

export const env = {
  apiOrigin,
  apiBaseUrl: `${apiOrigin}/api/v1`,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
} as const;

export const supabaseConfigured =
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
