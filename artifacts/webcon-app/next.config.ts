import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/db"],
  serverExternalPackages: ["pg", "bcryptjs", "pg-protocol", "nodemailer"],
};

export default nextConfig;
