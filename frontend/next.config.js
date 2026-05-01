/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // Use API_URL for server-side proxy target (K8s service or localhost)
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        // Auth endpoints: keep /api/auth prefix (backend mounts better-auth at /api/auth)
        source: '/api/auth/:path*',
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        // Custom API endpoints: strip /api prefix (backend routes are at /projects, etc.)
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
