/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose database environment variables to the client side only if they are
  // defined.  Provide sensible defaults for local development.  These
  // defaults match the fallback values used in lib/db.js.  Overriding them
  // via Vercel environment variables is recommended for production.
  env: {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '3306',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'vsol_mini'
  }
};

module.exports = nextConfig;