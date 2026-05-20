/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'] }
};
export default nextConfig;
