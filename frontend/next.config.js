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
        // WebSocket ticket endpoint: keep /api/ws prefix
        source: '/api/ws/:path*',
        destination: `${apiUrl}/api/ws/:path*`,
      },
      {
        // API v1 endpoints: preserve /api/v1 prefix (messages controller, etc.)
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        // Custom API endpoints: strip /api prefix (backend routes are at /projects, /sessions, etc.)
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
