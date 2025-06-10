/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /pdf\.worker\.min\.js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });

    return config;
  },
};

module.exports = nextConfig;
