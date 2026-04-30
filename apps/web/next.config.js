/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@floricultura/shared-types'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
