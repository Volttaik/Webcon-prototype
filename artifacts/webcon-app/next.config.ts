import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@workspace/db"],
  serverExternalPackages: [
    "pg",
    "bcryptjs",
    "pg-protocol",
    "nodemailer",
    "@huggingface/transformers",
    "onnxruntime-web",
    "onnxruntime-node",
  ],
};

export default nextConfig;
