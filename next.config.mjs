/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer', 'resend'] }
};
export default nextConfig;
