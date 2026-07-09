import fs from "node:fs";
import path from "node:path";

function readApiProxyTarget() {
  if (process.env.API_PROXY_TARGET) {
    return process.env.API_PROXY_TARGET;
  }

  const rootEnvPath = path.resolve(process.cwd(), "../.env");
  if (!fs.existsSync(rootEnvPath)) {
    return "";
  }

  const envFile = fs.readFileSync(rootEnvPath, "utf8");
  const matchingLine = envFile
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("API_PROXY_TARGET="));

  if (!matchingLine) {
    return "";
  }

  return matchingLine.split("=", 2)[1]?.trim() ?? "";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode helps surface unsafe React patterns during development.
  reactStrictMode: true,
  async rewrites() {
    const apiProxyTarget = readApiProxyTarget();

    if (!apiProxyTarget) {
      throw new Error("Missing required API_PROXY_TARGET environment variable.");
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`
      }
    ];
  }
};

export default nextConfig;
