// Elige Firebase si hay configuración; si no, modo demo.
import { firebaseConfig } from '../firebase-config.js';
import * as fb from './firebase.js';
import * as demo from './demo.js';

const store = firebaseConfig.apiKey ? fb : demo;
export default store;
