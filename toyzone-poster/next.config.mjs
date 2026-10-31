/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // font & emoji template ikut dibundel ke serverless function
    outputFileTracingIncludes: {
      '/api/image/[id]': ['./fonts/**', './emoji/**', './brand/**'],
    },
  },
};
export default nextConfig;
