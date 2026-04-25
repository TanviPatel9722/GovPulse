import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: path.resolve(process.cwd()),
  allowedDevOrigins: ["127.0.0.1"]
};

export default nextConfig;
