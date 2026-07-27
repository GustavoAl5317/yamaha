/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não empacotar o driver nativo Informix — carregar via require em runtime.
  experimental: {
    serverComponentsExternalPackages: ["informixdb"],
  },
};

export default nextConfig;
