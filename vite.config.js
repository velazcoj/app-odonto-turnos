import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para que funcione igual en Firebase Hosting y en GitHub Pages (subcarpeta)
export default defineConfig({
  plugins: [react()],
  base: './',
});
