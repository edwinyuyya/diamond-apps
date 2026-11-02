/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@netlify/blobs'],
  },
};
export default nextConfig;
