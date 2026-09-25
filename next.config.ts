import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v2 loads pdfjs-dist workers and a native canvas binding at runtime; bundling breaks both.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
