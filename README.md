# Formulario Académicos FECSH

Formulario web para registro de información académica de la Facultad de Educación, Ciencias Sociales y Humanidades (FECSH) de la Universidad de La Frontera.

**URL de producción:** `https://TU_USUARIO.github.io/formulario-FECSH/`

---

## 🏗️ Arquitectura

```
┌──────────────────┐     HTTPS POST (JSON)      ┌─────────────────────┐
│  GitHub Pages    │ ─────────────────────────▶ │  Google Apps Script │
│  (Sitio estático)│                            │  (Web App)          │
└──────────────────┘                            └──────────┬──────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────────┐
                                                   │  Google Sheets      │
                                                   │  (Base de datos)    │
                                                   └─────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
formulario-FECSH/
├── index.html      # Formulario principal + Auth gate
├── style.css       # Estilos UFRO/FECSH (responsive, accesible)
├── script.js       # Lógica: auth, filas dinámicas, validación, envío
├── config.js       # Configuración (URL Apps Script, dominios permitidos)
├── .nojekyll       # Desactiva Jekyll en GitHub Pages
└── README.md       # Esta documentación
```

---

## ⚙️ Configuración

### 1. Google Sheets (Base de datos)

Crear una hoja de cálculo con **7 pestañas** con nombres exactos y headers en fila 1:

| Pestaña | Headers (A:N) |
|---------|---------------|
| **Perfil** | `submission_id`, `timestamp`, `nombre`, `email`, `telefono`, `departamento` |
| **Pregrados** | `submission_id`, `timestamp`, `titulo`, `institucion`, `pais` |
| **Magisteres** | `submission_id`, `timestamp`, `titulo`, `institucion`, `pais` |
| **Doctorados** | `submission_id`, `timestamp`, `titulo`, `institucion`, `pais` |
| **Proyectos** | `submission_id`, `timestamp`, `nombre_proyecto`, `fondo`, `anio_inicio`, `anio_termino`, `titulo_proyecto`, `investigador_responsable`, `coinvestigadores` |
| **Publicaciones** | `submission_id`, `timestamp`, `titulo`, `medio`, `autores`, `anio`, `issn`, `paginas`, `bases_datos` |
| **Libros** | `submission_id`, `timestamp`, `tipo`, `titulo`, `autores`, `editorial`, `anio`, `isbn` |

### 2. Google Apps Script (Backend)

1. Abrir [script.google.com](https://script.google.com) → Nuevo proyecto
2. Pegar código de `Code.gs` (ver abajo)
3. **Implementar** → **Nueva implementación** → Tipo: **Aplicación web**
   - Ejecutar como: **Yo** (tu cuenta @ufrontera.cl)
   - Quién tiene acceso: **Cualquiera**
4. Copiar **URL de la aplicación web** (formato: `https://script.google.com/macros/s/XXXX/exec`)

### 3. Configuración Local (`config.js`)

```javascript
window.FECSH_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec',
  AUTH_DOMAINS: ['@ufrontera.cl'],
  SHEET_ID: 'TU_SHEET_ID'
};
```

---

## 🔐 Autenticación

Validación simple por **dominio de correo**: solo emails terminados en `@ufrontera.cl` pueden acceder.

- El usuario ingresa su email en la pantalla inicial
- Si el dominio es válido → se muestra el formulario completo
- El email se pre-llena y queda de solo lectura

---

## 📋 Campos del Formulario

| Sección | Obligatorio | Repetible | Descripción |
|---------|:-----------:|:---------:|-------------|
| **Perfil Personal** | ✅ | ❌ | Nombre, email, teléfono, departamento (7 opciones) |
| **Pregrados** | ✅ (mín 1) | ✅ | Título, institución, país |
| **Magísteres** | ❌ | ✅ | Título, institución, país |
| **Doctorados** | ❌ | ✅ | Título, institución, país |
| **Proyectos** | ❌ | ✅ | 7 campos + co-investigadores |
| **Publicaciones** | ❌ | ✅ | 7 campos + checkboxes (WoS, SciELO, Scopus, Otro) |
| **Libros/Capítulos** | ❌ | ✅ | 6 campos + select tipo (Libro/Capítulo) |

---

## 🚀 Deploy en GitHub Pages

### Opción A: Desde la interfaz web
1. Settings → Pages → Source: **Deploy from branch**
2. Branch: `main` / `/ (root)`
3. Save → esperar ~1-2 min

### Opción B: Git CLI
```bash
git add .
git commit -m "feat: Formulario FECSH v1.0"
git push origin main
# Luego activar Pages en Settings
```

---

## 📊 Exportar a CSV

Cada pestaña tiene su URL CSV pública:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID_PESTAÑA}
```

Obtener `GID` de cada pestaña (en URL: `#gid=XXXXXX`).

**Ejemplos:**
- Perfil: `.../export?format=csv&gid=0`
- Pregrados: `.../export?format=csv&gid=123456789`

---

## 🛠️ Mantenimiento

### Agregar/Modificar Departamentos
Editar `index.html` → `<select id="departamento">` → options

### Cambiar Colores UFRO
Editar `style.css` → variables `:root`:
```css
--ufro-azul: #003366;
--ufro-celeste: #0099CC;
--ufro-morado: #663399;
```

### Agregar Nueva Sección Repetible
1. HTML: Nueva `<section>` con `data-section="nueva"` + `<template>`
2. JS: Agregar a `DYNAMIC_SECTIONS` en `script.js`
3. Apps Script: Agregar pestaña en Sheets + case en `doPost`
4. Config: Actualizar headers esperados

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| CORS error | Verificar que Apps Script tiene `Access-Control-Allow-Origin: *` |
| "Solo @ufrontera.cl" | Verificar `AUTH_DOMAINS` en `config.js` y Apps Script |
| Datos no guardan | Revisar Logs en Apps Script (Ejecutar → Registros) |
| Formulario no envía | Verificar `APPS_SCRIPT_URL` en `config.js` coincide con deploy |
| CSS no carga | Verificar que GitHub Pages está activo y `.nojekyll` existe |

---

## 📝 Código Apps Script (`Code.gs`)

```javascript
const CONFIG = {
  SHEET_ID: 'TU_SHEET_ID',
  AUTH_DOMAINS: ['@ufrontera.cl'],
  SHEET_NAMES: {
    perfil: 'Perfil',
    pregrados: 'Pregrados',
    magisteres: 'Magisteres',
    doctorados: 'Doctorados',
    proyectos: 'Proyectos',
    publicaciones: 'Publicaciones',
    libros: 'Libros'
  }
};

function doPost(e) {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    if (e.httpMethod === 'OPTIONS') {
      return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT).setHeaders(headers);
    }
    
    const data = JSON.parse(e.postData.contents);
    const email = (data.perfil?.email || '').toLowerCase();
    const autorizado = CONFIG.AUTH_DOMAINS.some(d => email.endsWith(d));
    
    if (!autorizado) {
      return jsonResponse({success: false, error: 'Email debe ser @ufrontera.cl'}, headers);
    }
    
    const perfil = data.perfil || {};
    const pregrados = data.pregrados || [];
    
    if (!perfil.nombre || !perfil.email || !perfil.departamento || pregrados.length === 0) {
      return jsonResponse({success: false, error: 'Faltan campos obligatorios'}, headers);
    }
    
    const submissionId = Utilities.getUuid();
    const timestamp = new Date();
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    const append = (sheetName, row) => {
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES[sheetName]);
      if (sheet) sheet.appendRow(row);
    };
    
    append('perfil', [submissionId, timestamp, perfil.nombre, perfil.email, perfil.telefono || '', perfil.departamento]);
    
    const sections = {
      pregrados: ['titulo','institucion','pais'],
      magisteres: ['titulo','institucion','pais'],
      doctorados: ['titulo','institucion','pais'],
      proyectos: ['nombre_proyecto','fondo','anio_inicio','anio_termino','titulo_proyecto','investigador_responsable','coinvestigadores'],
      publicaciones: ['titulo','medio','autores','anio','issn','paginas','bases_datos'],
      libros: ['tipo','titulo','autores','editorial','anio','isbn']
    };
    
    Object.entries(sections).forEach(([key, fields]) => {
      (data[key] || []).forEach(item => {
        append(key, [submissionId, timestamp, ...fields.map(f => item[f] || '')]);
      });
    });
    
    return jsonResponse({success: true, id: submissionId}, headers);
    
  } catch (err) {
    return jsonResponse({success: false, error: err.toString()}, headers);
  }
}

function jsonResponse(obj, headers = {}) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}
```

---

## 📄 Licencia

Uso interno FECSH - Universidad de La Frontera.

---

## 👥 Contacto

**Desarrollado para:** Facultad de Educación, Ciencias Sociales y Humanidades  
**Universidad:** Universidad de La Frontera  
**Email:** nicolas.venegas@ufrontera.cl