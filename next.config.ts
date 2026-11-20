import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Logos y fondo pasan por el servidor (las fotos de la galería van directo a Supabase)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
