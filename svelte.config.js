import adapter from '@sveltejs/adapter-vercel';

const config = {
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x'
    }),
    paths: {
      // Use BASE_PATH env var if set, otherwise empty (for standalone Vercel deployment)
      // Set BASE_PATH=/promptvault in Vercel when deploying to kiang.net/promptvault
      base: process.env.BASE_PATH || ''
    }
  }
};

export default config;
