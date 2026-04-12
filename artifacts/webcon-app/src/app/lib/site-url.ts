import { NextRequest } from "next/server";

export function getSiteUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0") && !host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    const proto = forwardedProto;
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
