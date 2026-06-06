import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/guitarsuite/' : './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        songsDb: resolve(__dirname, 'songs-db.html'),
        chordsDb: resolve(__dirname, 'chords-db.html'),
      },
    },
  },
});
