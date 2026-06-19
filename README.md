# FilmScript - Guia de Despliegue Completo

Esta aplicacion tiene dos servicios:

- Frontend: React + Vite (carpeta raiz)
- Backend: Node + Express + MongoDB (carpeta backend)

## Arquitectura recomendada

- Backend en Render (o Railway)
- Frontend en Vercel (o Netlify)
- Base de datos en MongoDB Atlas

## 1. Variables de entorno

Archivos de referencia incluidos en el repositorio:

- .env.example (frontend)
- backend/.env.example (backend)

### Backend (Render/Railway)

Configura estas variables en el panel del servicio backend:

- MONGO_URI
- JWT_SECRET
- PORT (Render lo define automaticamente)
- NODE_ENV=production
- ADMIN_EMAIL
- ADMIN_PASSWORD
- AI_API_KEY
- AI_MODEL (ejemplo: gpt-4.1-mini)
- AI_API_URL (ejemplo: https://api.openai.com/v1/chat/completions)
- CORS_ORIGIN (URL del frontend, por ejemplo https://filmscript.vercel.app)

Si usaras invitaciones por correo SMTP:

- APP_URL
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- FROM_EMAIL
- FROM_NAME
- REPLY_TO_EMAIL

### Frontend (Vercel/Netlify)

- VITE_API_URL=https://TU_BACKEND.onrender.com

## 2. Desplegar backend en Render

Opcion recomendada (automatica): usa el archivo render.yaml incluido en la raiz.

1. En Render elige "Blueprint".
2. Conecta el repositorio.
3. Render detecta render.yaml y crea el servicio backend.
4. Completa los envVars marcados como sync: false.

Opcion manual (si no usas Blueprint):

1. Sube el proyecto a GitHub.
2. En Render crea un "Web Service" nuevo.
3. Selecciona el repositorio.
4. Configura:
	- Root Directory: backend
	- Build Command: npm install
	- Start Command: npm start
5. Agrega las variables de entorno del backend.
6. Deploy.
7. Verifica salud:
	- GET https://TU_BACKEND.onrender.com/api/health

## 3. Desplegar frontend en Vercel

Opcion recomendada: importar el proyecto con el archivo vercel.json incluido en la raiz.

1. En Vercel, Import Project desde GitHub.
2. Configura:
	- Root Directory: /
	- Framework preset: Vite
	- Build command: npm run build
	- Output directory: dist
3. Agrega variable:
	- VITE_API_URL=https://TU_BACKEND.onrender.com
4. Deploy.

## 4. Conectar CORS entre frontend y backend

En backend define:

- CORS_ORIGIN=https://TU_FRONTEND.vercel.app

Si manejas varios dominios, separalos por coma:

- CORS_ORIGIN=https://TU_FRONTEND.vercel.app,https://www.tudominio.com

## 5. Pruebas de produccion (checklist)

1. Registro e inicio de sesion.
2. Crear y guardar proyecto.
3. Abrir editor y guardar cambios.
4. Probar IA (feedback + resumen).
5. Descargar resumen en PDF y Word.
6. Probar panel administrador.
7. Probar compartir colaborador.

## 6. "Instalar en PCs"

Con este despliegue, los usuarios no necesitan instalar software:

1. Abren la URL del frontend en cualquier PC.
2. Opcional: crear acceso directo en escritorio del navegador.

Si mas adelante quieres instalador real (.exe/.msi), eso seria una fase adicional con Electron.

## 7. Comandos locales

Frontend:

- npm install
- npm run dev
- npm run build

Backend:

- cd backend
- npm install
- npm run dev
