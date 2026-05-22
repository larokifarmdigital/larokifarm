import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'yovi040n',
    dataset: 'cima',
  },
  deployment: {
    appId: 'g4768nrlunghf8gmmuqgnlwq',
  },
});
