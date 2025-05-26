import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',  // auto updates the service worker
      manifest: {
        name: 'Library Book Checker',
        short_name: 'BookChecker',
        description: 'Check if your books are available at your library',
        theme_color: '#ffffff',
        // icons: [
        //   {
        //     src: 'pwa-192x192.png',  // you add these images in the public folder
        //     sizes: '192x192',
        //     type: 'image/png',
        //   },
        //   {
        //     src: 'pwa-512x512.png',
        //     sizes: '512x512',
        //     type: 'image/png',
        //   },
        // ],
      },
      workbox: {
        // You can customize caching strategies here if needed
      },
    }),
  ],
  server: {
    proxy: {
      //Proxy for Books API
      '/api': {
        target: 'https://openweb.nlb.gov.sg/api',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      }
    }
  }
});
