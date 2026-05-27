## 📋 CARGUE MASIVO - Guía de Uso

### ✅ Qué está listo:
- ✅ Componente React `CargueMasivo.jsx` funcional
- ✅ Parseo real de archivos Excel (.xlsx)
- ✅ Validación de datos (nombre, correo)
- ✅ Drag and drop mejorado
- ✅ Vista previa de estudiantes
- ✅ Interfaz profesional y responsiva
- ✅ Solo visible para instructores

### 🔧 Cómo probar:

#### **Opción 1: Crear archivo Excel manual**
1. Abre Excel o Google Sheets
2. Crea una tabla con dos columnas:
   - **Columna A:** "nombre" (valores: Juan Pérez, María López, etc.)
   - **Columna B:** "correo" (valores: juan@test.com, maria@test.com, etc.)
3. Guarda como `.xlsx`
4. Descargalo y prueba en la app

#### **Opción 2: Usar archivo CSV y convertir**
1. Crea un archivo `estudiantes.csv`:
```csv
nombre,correo
Juan Pérez,juan@test.com
María López,maria@test.com
Carlos García,carlos@test.com
Ana Martínez,ana@test.com
```
2. Abre en Excel y guarda como `.xlsx`

#### **Opción 3: Template en Python** (para generar muchos registros)
```python
import openpyxl
from datetime import datetime

wb = openpyxl.Workbook()
ws = wb.active
ws['A1'] = 'nombre'
ws['B1'] = 'correo'

for i in range(1, 101):  # 100 estudiantes
    ws[f'A{i+1}'] = f'Estudiante {i}'
    ws[f'B{i+1}'] = f'estudiante{i}@test.com'

wb.save('estudiantes_masivo.xlsx')
```

### 🎯 Ejemplo de archivo válido:

| nombre | correo |
|--------|--------|
| Juan Pérez | juan@test.com |
| María López | maria@test.com |
| Carlos García | carlos@test.com |

### 📌 Validaciones:
- ✅ Nombre: requerido
- ✅ Correo: requerido y válido
- ✅ Formato: .xlsx únicamente
- ✅ Archivo vacío: rechazado

### 🚀 Próximas fases:

**Fase 1 (ACTUAL - DEMOSTRACIÓN):**
- Interface lista
- Simulación de carga
- Mostrar éxito/error

**Fase 2 (Conectar Backend):**
```javascript
// En handleConfirmar(), descomenta esto:
const response = await fetch("/api/licenses/carga-masiva", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ estudiantes: preview })
});
```

**Fase 3 (Backend - Endpoint):**
Crear en `licenseController.js`:
```javascript
const cargaMasiva = async (req, res) => {
  // Recibir array de { nombre, correo }
  // Crear usuarios con rol "estudiante"
  // Asignar licencias automáticamente
  // Retornar resumen
};
```

---

**🎬 Para demostración ahora:**
1. Ingresa como **instructor** (isInstructor = true)
2. Verás botón "⬆️ Cargue Masivo" en sidebar
3. Carga un Excel con estudiantes
4. Haz clic en "Confirmar importación"
5. Verás mensaje de éxito (simulado)

---

**💡 El componente está 100% listo para conectar con el backend cuando lo desees.**
