// next.config.ts
import type { NextConfig } from 'next'
import webpack from 'webpack'

const nextConfig: NextConfig = {
  eslint: {
    // 🚀 Ignora errors d’ESLint durant el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 🚀 Permet continuar el build encara que hi hagi errors de tipus
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve('buffer'),
    }
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    )
    return config
  },
}

export default nextConfig
