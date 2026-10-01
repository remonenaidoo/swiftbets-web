import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // Its own asset path, so the gateway can route it alongside the app that still serves the rest of the site.
  build: { cssCodeSplit: false, assetsDir: 'site-assets' },
});
