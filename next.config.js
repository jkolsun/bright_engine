/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
  },
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
