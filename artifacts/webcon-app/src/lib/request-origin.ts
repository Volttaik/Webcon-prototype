import type { NextRequest } from "next/server";

export function getPublicOrigin(request: NextRequest): string {
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim();

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  const origin = request.headers.get("origin");
  if (origin && !origin.startsWith("null")) return origin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }

  const host = request.headers.get("host");
  if (host) {
    const proto =
      forwardedProto || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  return new URL(request.url).origin;
}
