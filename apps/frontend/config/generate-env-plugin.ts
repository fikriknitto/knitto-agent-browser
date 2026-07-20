import dotenv from 'dotenv';
import { Plugin } from 'vite';

export default function generateEnvPlugin(): Plugin {
  let isBuild = false;
  const env = dotenv.config().parsed || {};
  const contentScript = `window.__ENV__=${JSON.stringify(env)};`;
  const generatedFileName = 'generated-env.js';
  const srcFileName = '/generated-env.js';

  return {
    name: 'generate-env',
    config(_, { command }) {
      isBuild = command === 'build';
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: generatedFileName,
        source: contentScript,
      });
    },
    transformIndexHtml(html) {
      if (!isBuild) {
        return {
          html,
          tags: [
            {
              tag: 'script',
              children: contentScript,
              injectTo: 'head',
            },
          ],
        };
      }
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: {
              src: srcFileName,
            },
            injectTo: 'body',
          },
        ],
      };
    },
  };
}
