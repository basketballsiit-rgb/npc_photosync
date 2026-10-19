/**
 * Utility to get the client-side base path for Next.js subpath deployments.
 * On production: https://service.npc.ac.th/npc_photosync
 */
export function getClientBasePath(): string {
  if (typeof window !== "undefined") {
    return window.location.pathname.startsWith("/npc_photosync") ? "/npc_photosync" : "";
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || (process.env.NODE_ENV === "production" ? "/npc_photosync" : "");
}

/**
 * Prefix an API or asset path with the client base path if needed.
 * Example: apiUrl("/api/albums") => "/npc_photosync/api/albums" (in prod)
 */
export function apiUrl(path: string): string {
  const base = getClientBasePath();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
