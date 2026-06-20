# FilmScript - Despliegue Gratis Paso a Paso

Este proyecto ya esta preparado para desplegarse gratis, sin dominio pago y con IA opcional.

Servicios:

- Frontend: React + Vite (raiz)
- Backend: Node + Express (carpeta backend)
- Base de datos: MongoDB Atlas (plan Free)

Stack recomendado (100% gratis):

- Frontend en Vercel (subdominio gratis .vercel.app)
- Backend en Render (subdominio gratis .onrender.com)
- MongoDB Atlas M0 Free

## 1) Crear la base de datos gratis (MongoDB Atlas)

1. Crea cuenta en MongoDB Atlas.
2. Crea un cluster M0 Free.
3. En "Database Access" crea un usuario con password.
4. En "Network Access" agrega IP 0.0.0.0/0 (o la que prefieras).
5. Copia tu cadena de conexion (MONGO_URI).

Ejemplo:

- mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/filmscript?retryWrites=true&w=majority

## 2) Desplegar backend gratis en Render

El repo ya trae render.yaml en la raiz, asi que puedes usar Blueprint.

1. Sube el proyecto a GitHub.
2. En Render crea "Blueprint".
3. Conecta el repositorio.
4. Render detecta render.yaml y crea el servicio backend.
5. Completa variables de entorno (las de sync: false).

Variables minimas obligatorias en backend:

- NODE_ENV=production
- MONGO_URI=tu_cadena_atlas
- JWT_SECRET=una_clave_larga_y_segura
- ADMIN_EMAIL=tu_correo_admin
- ADMIN_PASSWORD=tu_password_admin
- CORS_ORIGIN=https://tu-frontend.vercel.app

Variables opcionales:

- IA: AI_API_KEY, AI_MODEL, AI_API_URL
- Correo SMTP: APP_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME, REPLY_TO_EMAIL

Nota sobre IA:

- Si NO configuras AI_API_KEY, la app funciona igual en funciones principales.
- Solo la parte de "analisis IA" quedara deshabilitada.

Verifica backend:

- GET https://tu-backend.onrender.com/api/health

## 3) Desplegar frontend gratis en Vercel

El repo ya trae vercel.json en la raiz.

1. En Vercel selecciona "Import Project" desde GitHub.
2. Confirma configuracion:
   - Root Directory: /
   - Framework: Vite
   - Build Command: npm run build
   - Output Directory: dist
3. Agrega variable de entorno:
   - VITE_API_URL=https://tu-backend.onrender.com
4. Deploy.

## 4) Conectar frontend y backend (CORS)

En Render, variable CORS_ORIGIN debe ser exactamente tu URL de Vercel:

- CORS_ORIGIN=https://tu-proyecto.vercel.app

Si tienes mas de un frontend, separa por comas:

- CORS_ORIGIN=https://tu-proyecto.vercel.app,https://otro-frontend.vercel.app

## 5) Checklist minimo de produccion

1. Registro de usuario e inicio de sesion.
2. Crear proyecto.
3. Abrir editor y guardar cambios.
4. Cerrar sesion e iniciar sesion nuevamente (datos persisten).
5. Descargar/exportar en PDF y Word.
6. Acceso de administrador.
7. Compartir colaborador (sin SMTP envia sin correo, pero comparte acceso).

## 6) Uso sin dominio pago

No necesitas comprar dominio:

- Frontend: https://tuapp.vercel.app
- Backend: https://tuapi.onrender.com

## 7) Si alguien descarga el proyecto y lo corre localmente

Frontend:

1. Copiar .env.example a .env
2. Definir VITE_API_URL=http://localhost:5000
3. Ejecutar npm install
4. Ejecutar npm run dev

Backend:

1. Copiar backend/.env.example a backend/.env
2. Completar MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
3. Ejecutar cd backend
4. Ejecutar npm install
5. Ejecutar npm run dev

## 8) Diagnostico rapido si algo falla

1. /api/health no responde: revisar MONGO_URI en Render.
2. Error CORS en navegador: revisar CORS_ORIGIN exacto.
3. Frontend no guarda: revisar VITE_API_URL.
4. IA falla: esperado si no definiste AI_API_KEY.
