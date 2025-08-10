import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'your-supabase-url.supabase.co',
      }
    ],
  },
  webpack: (config, { isServer }) => {
    // These are optional dependencies of genkit, we don't need them to be bundled.
    config.externals.push('@genkit-ai/firebase', '@opentelemetry/exporter-jaeger');
    return config;
  }
};

export default nextConfig;
