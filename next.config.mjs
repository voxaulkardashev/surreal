/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // GSAP and Lenis ship ESM builds that tree-shake better when optimised.
    optimizePackageImports: ['gsap', 'lenis'],
  },
};

export default nextConfig;
