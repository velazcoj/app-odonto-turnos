import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { firebaseConfig } from './src/firebase-config.js';

// Sin firebaseConfig la app arranca en modo demo: publicada así, ella cargaría pacientes en el
// teléfono creyendo que se guardan en la nube. Mejor que el build (y con él el deploy) falle.
// Para un build de prueba en modo demo a propósito: DEMO=1 npm run build.
const exigirFirebase = {
  name: 'exigir-firebase',
  apply: 'build',
  buildStart() {
    if (!firebaseConfig.apiKey && process.env.DEMO !== '1') {
      this.error('Falta firebaseConfig.apiKey en src/firebase-config.js: no se publica en modo demo.');
    }
  },
};

// base './' para que funcione igual en Firebase Hosting y en GitHub Pages (subcarpeta)
export default defineConfig({
  plugins: [react(), exigirFirebase],
  base: './',
});
