const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/npc_photosync" : "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "archiver", "@prisma/client", "prisma"],
  },
};

export default nextConfig;
