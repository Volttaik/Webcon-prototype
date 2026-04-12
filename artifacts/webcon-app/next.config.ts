import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/db"],
  serverExternalPackages: ["pg", "bcryptjs", "pg-protocol", "nodemailer"],
  webpack(config, { isServer }) {
    if (isServer) {
      const existingExternals = config.externals || [];
      const extraExternals = [
        "libsql",
        "@libsql/linux-x64-gnu",
        "@libsql/linux-x64-musl",
        "@libsql/darwin-x64",
        "@libsql/darwin-arm64",
        "@libsql/win32-x64-msvc",
      ];
      config.externals = [...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]), ...extraExternals];
    }
    return config;
  },
};

export default nextConfig;
