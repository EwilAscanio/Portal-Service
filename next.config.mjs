/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["exceljs"],
  // 10 MB por archivo más multipart; la ruta limita el cuerpo a 11 MB.
  experimental: { proxyClientMaxBodySize: "12mb" },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
