import adapter from '@sveltejs/adapter-node';

const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: '/promptvault'
    }
  }
};

export default config; 