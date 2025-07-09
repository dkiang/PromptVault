import adapter from '@sveltejs/adapter-auto';

const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/promptvault' : ''
    }
  }
};

export default config;
