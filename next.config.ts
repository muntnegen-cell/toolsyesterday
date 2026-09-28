import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server (node server.js) for the Docker image on Hetzner.
  output: "standalone",
  // pdf-parse v2 loads pdfjs-dist workers and a native canvas binding at runtime; bundling breaks both.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // pdf-parse loads @napi-rs/canvas (plus its per-platform native binary) and the pdf.js worker at
  // runtime, so output tracing misses them; without these the standalone server cannot parse PDFs.
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/@napi-rs/**/*", "./node_modules/pdfjs-dist/legacy/build/**/*"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
