/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
  },
  // Use standalone output (server-side rendering) - don't statically export pages
  output: 'standalone',
}

module.exports = nextConfig
