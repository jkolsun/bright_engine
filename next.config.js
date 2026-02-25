/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
  },
  serverExternalPackages: ['@prisma/client', 'prisma', 'ioredis', 'bullmq'],
}

module.exports = nextConfig
