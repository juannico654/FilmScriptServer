## 🔗 CARGUE MASIVO - Conexión Frontend-Backend

### ✅ BACKEND LISTO

**Endpoint:** `POST /api/licenses/carga-masiva`

**Headers requeridos:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {TOKEN}"
}
```

**Request Body:**
```json
{
  "estudiantes": [
    {
      "nombre": "Juan Pérez",
      "correo": "juan@test.com"
    },
    {
      "nombre": "María López",
      "correo": "maria@test.com"
    }
  ]
}
```

---

### 📥 RESPONSE - ÉXITO (201)

```json
{
  "message": "Cargue completado: 2 exitosos, 0 errores",
  "resumen": {
    "total": 2,
    "exitosos": 2,
    "errores": 0,
    "porcentajeExito": 100
  },
  "detalles": {
    "exitosos": [
      {
        "fila": 1,
        "nombre": "Juan Pérez",
        "correo": "juan@test.com",
        "licenciaExpira": "2026-06-27T12:34:56.789Z"
      },
      {
        "fila": 2,
        "nombre": "María López",
        "correo": "maria@test.com",
        "licenciaExpira": "2026-06-27T12:34:56.789Z"
      }
    ],
    "errores": []
  }
}
```

---

### 📊 RESPONSE - CON ERRORES PARCIALES

```json
{
  "message": "Cargue completado: 1 exitosos, 1 errores",
  "resumen": {
    "total": 2,
    "exitosos": 1,
    "errores": 1,
    "porcentajeExito": 50
  },
  "detalles": {
    "exitosos": [
      {
        "fila": 1,
        "nombre": "Juan Pérez",
        "correo": "juan@test.com",
        "licenciaExpira": "2026-06-27T12:34:56.789Z"
      }
    ],
    "errores": [
      {
        "fila": 2,
        "correo": "maria@test.com",
        "error": "Formato de correo inválido"
      }
    ]
  }
}
```

---

## 🚀 CONEXIÓN EN FRONTEND

**Archivo:** `src/pages/CargueMasivo.jsx`

**En la función `handleConfirmar()`, descomenta esto:**

```javascript
const handleConfirmar = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    
    if (!token) {
      setError("No se encontró token de autenticación");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/licenses/carga-masiva", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ estudiantes: preview })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error en cargue");
    }

    // Mostrar resumen de resultados
    setSuccess(true);
    console.log("Resultados:", data.detalles);
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
      setPreview([]);
      setFileName("");
      setSuccess(false);
    }, 3000);

  } catch (err) {
    setError("Error al confirmar: " + err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🔒 VALIDACIONES BACKEND

✅ **Validaciones implementadas:**

1. **Array de estudiantes:**
   - Requerido
   - Máximo 500 por carga
   - No vacío

2. **Datos por estudiante:**
   - `nombre`: requerido, no vacío
   - `correo`: requerido, formato válido

3. **Reglas de negocio:**
   - Si usuario existe con rol diferente a "estudiante" → Error
   - Si usuario existe con licencia activa → Error
   - Si usuario existe sin licencia → Se activa nueva licencia
   - Si usuario no existe → Se crea + se asigna licencia

4. **Permisos:**
   - Solo instructores pueden hacer cargue
   - Requiere token JWT válido

---

## 🎯 QUÉS PASA BACKEND

**Para cada estudiante en el Excel:**

1. **Validar datos**
   - ✓ Nombre no vacío
   - ✓ Correo válido

2. **Buscar usuario**
   - Si existe con rol ≠ "estudiante" → ERROR
   - Si existe sin licencia → Asignar licencia
   - Si no existe → Crear usuario

3. **Crear/Actualizar licencia**
   - Tipo: "mensual"
   - Duración: 1 mes (automático)
   - Estado: "activa"
   - Asignado por: ID del instructor

4. **Guardar en BD**
   - Usuario
   - Licencia

5. **Retornar resumen**
   - Exitosos (con fecha expiración)
   - Errores (con razón)
   - Porcentaje éxito

---

## 📝 EJEMPLO DE POSTMAN

```
POST http://localhost:5000/api/licenses/carga-masiva

Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Body (raw JSON):
{
  "estudiantes": [
    {
      "nombre": "Juan Pérez",
      "correo": "juan@test.com"
    },
    {
      "nombre": "María López",
      "correo": "maria@test.com"
    },
    {
      "nombre": "Carlos García",
      "correo": "carlos@test.com"
    }
  ]
}
```

---

## ⚡ PRÓXIMOS PASOS

1. **Ahora:** Backend listo
2. **Frontend:** Descomentar código en `CargueMasivo.jsx` línea ~100
3. **Test:** Probar con Postman primero
4. **Integración:** Conectar frontend + backend
5. **Deploy:** Subir a GitHub

---

**Todo está listo para conectar. Solo necesitas descomentar 15 líneas en el frontend.**
