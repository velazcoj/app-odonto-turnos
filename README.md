# Turnos — agenda para consultorio odontológico

Web app instalable en iPhone (PWA) para registrar turnos y llevar un directorio de pacientes.
React + Vite + Firebase (Auth + Firestore). Sin historias clínicas.

## Qué tiene

- **Hoy**: próximo paciente con WhatsApp y llamar a un toque, turnos del día y recordatorios para mañana.
- **Agenda**: semana de lunes a domingo, línea de tiempo del día con huecos libres tocables.
- **Pacientes**: búsqueda por nombre, apellido, DNI o teléfono; filtros Recientes y Cumplen este mes.
- **Ficha**: datos de contacto, obra social, nota y turnos del paciente.
- **Turnos**: duración, motivo (con color), estado, aviso de superposición, bloqueo de horarios.
- **Ajustes**: horario de atención y mensaje de recordatorio de WhatsApp.

Sin configuración de Firebase arranca en **modo demo** (datos de ejemplo en el navegador).

## Puesta en marcha

1. Crear proyecto en Firebase, habilitar **Authentication → Email/contraseña**, crear el usuario a mano en *Users*.
2. Crear **Firestore** (modo producción) y pegar el contenido de `firestore.rules` en la pestaña *Reglas*.
3. Pegar el `firebaseConfig` de la app web en `src/firebase-config.js`.
4. Publicar:
   - **GitHub Pages**: subir a un repo público, en *Settings → Pages → Source* elegir **GitHub Actions**. El workflow de `.github/workflows/deploy.yml` publica en cada push a `main`.
   - **Firebase Hosting**: `npm install`, `npm run build`, `firebase deploy`.

## Instalar en el iPhone

Abrir el link en **Safari** → botón Compartir → **Agregar a pantalla de inicio**.

## Datos

`users/{uid}/patients/{id}` y `users/{uid}/appointments/{id}` (fecha `YYYY-MM-DD`, hora `HH:mm`, duración en minutos).
Las reglas solo permiten que cada usuaria lea y escriba lo suyo.
