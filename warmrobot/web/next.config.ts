import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  transpilePackages: ["@warmrobot/core"],
  outputFileTracingRoot: path.join(rootDir, ".."),
};

export default nextConfig;
