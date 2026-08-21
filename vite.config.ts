import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      // Each module is its own entry point so their design systems and global
      // styles stay isolated: PMS (index), EMS, and Tenant Operations.
      input: {
        pms: fileURLToPath(new URL('./index.html', import.meta.url)),
        ems: fileURLToPath(new URL('./ems.html', import.meta.url)),
        tenant: fileURLToPath(new URL('./tenant.html', import.meta.url)),
      },
      output: {
        // Split the heavy third-party layers so a screen change never
        // re-downloads the chart engine or the primitives.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: { port: 5173 },
});
