/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // No special features needed; the demo runs on stock Next 15 app router.
  },
  // The AOMI runtime is fetched at request time; we don't need to pin it here.
  env: {
    NEXT_PUBLIC_AOMI_BASE_URL: process.env.AOMI_BASE_URL ?? "https://aomi.dev",
    NEXT_PUBLIC_AOMI_APP: process.env.NEXT_PUBLIC_AOMI_APP ?? "polymarket",
    NEXT_PUBLIC_MOCK_MODE: (!process.env.AOMI_API_KEY || process.env.AOMI_FORCE_MOCK === "1") ? "1" : "0",
  },
};

export default nextConfig;
