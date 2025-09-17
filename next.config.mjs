/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    allowedDevOrigins: ['https://*.app.github.dev'],
  },
};
export default nextConfig;
