/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tasksphere-webapp-nghiadev.s3.ap-southeast-1.amazonaws.com'
        // port: '4000'
        // pathname: '/photos/**'
      }
    ]
  },
  logging: {
    fetches: {
      fullUrl: true
    }
  }
}

module.exports = nextConfig
