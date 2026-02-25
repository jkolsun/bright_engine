/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'ioredis', 'bullmq'],
  },
}

module.exports = nextConfig
