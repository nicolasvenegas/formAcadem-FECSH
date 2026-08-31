# Formulario Académicos FECSH - Configuración Completa

## 📋 Resumen del Proyecto

Sitio: https://nicolasvenegas.github.io/formAcadem-FECSH/
Repositorio: https://github.com/nicolasvenegas/formAcadem-FECSH

---

## 🔗 URLs de Producción

| Componente | URL |
|------------|-----|
| **GitHub Pages (Formulario)** | https://nicolasvenegas.github.io/formAcadem-FECSH/ |
| **Cloudflare Worker (CORS Proxy)** | https://fecsh-proxy.nicolas-venegas.workers.dev/ |
| **Apps Script v5 (Backend)** | https://script.google.com/macros/s/AKfycbzeAPVbJex8zzLy7qddWPfzW6S5r_NtLA1LMi_8LNBPhLCBmFa3SqOG78Yd4aRmv0UT/exec |
| **Google Sheet (BD)** | https://docs.google.com/spreadsheets/d/1MGr4dJvx-tqzuYsfILi36R55JKeUPamTuICxVtA14v4/edit |

---

## 📊 Google Sheets - Estructura

Sheet ID: `1MGr4dJvx-tqzuYsfILi36R55JKeUPamTuICxVtA14v4`

### 7 Pestañas requeridas (nombres exactos):

| Pestaña | Headers (Fila 1) |
|---------|------------------|
| **Perfil** | submission_id, timestamp, nombre, email, telefono, departamento |
| **Pregrados** | submission_id, timestamp, titulo, institucion, pais |
| **Magisteres** | submission_id, timestamp, titulo, institucion, pais |
| **Doctorados** | submission_id, timestamp, titulo, institucion, pais |
| **Proyectos** | submission_id, timestamp, nombre_proyecto, fondo, anio_inicio, anio_termino, titulo_proyecto, investigador_responsable, coinvestigadores |
| **Publicaciones** | submission_id, timestamp, titulo, medio, autores, anio, issn, paginas, bases_datos |
| **Libros** | submission_id, timestamp, tipo, titulo, autores, editorial, anio, isbn |

---

## ⚙️ Configuración Frontend (config.js)

```javascript
window.FECSH_CONFIG = {
  APPS_SCRIPT_URL: 'https://fecsh-proxy.nicolas-venegas.workers.dev/',
  AUTH_DOMAINS: ['@ufrontera.cl'],
  SHEET_ID: '1MGr4dJvx-tqzuYsfILi36R55JKeUPamTuICxVtA14v4'
};
```

---

## 🔐 Seguridad Implementada

| Capa | Medida |
|------|--------|
| Frontend | Validación HTML5 `pattern=".*@ufrontera\.cl$"` |
| Frontend | Sin placeholder que revele dominio |
| Frontend | Honeypot field (`website`) invisible |
| Backend | Validación dominio `@ufrontera.cl` |
| Backend | Rate limiting 5 req/hora por email (CacheService) |
| Backend | Honeypot check (rechaza si `website` tiene valor) |
| Backend | Escape fórmula Sheets (`+` `=` `-` `@` → `'`) |
| Backend | Audit logging en Apps Script |

---

## 🚀 Apps Script - Deploy

1. Abrir: https://script.google.com/d/1SXTqwHw8aPF6n-vyEUIVglZtSgugayyCz01dz1qDqpc5Hk9J6BhHg619/edit
2. Copiar código de `apps-script/Code.gs`
3. **Implementar** → **Nueva implementación** → **Aplicación web**
   - Ejecutar como: **Yo** (nicolas.venegas@ufrontera.cl)
   - Quién tiene acceso: **Cualquiera**
4. **Implementar** → Copiar URL

---

## ☁️ Cloudflare Worker (CORS Proxy)

URL: https://fecsh-proxy.nicolas-venegas.workers.dev/

Código en dashboard Cloudflare → Workers & Pages → fecsh-proxy

```javascript
export default {
  async fetch(request, env, ctx) {
    const targetUrl = 'https://script.google.com/macros/s/AKfycbzeAPVbJex8zzLy7qddWPfzW6S5r_NtLA1LMi_8LNBPhLCBmFa3SqOG78Yd4aRmv0UT/exec';
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      const body = await request.text();
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        redirect: 'follow'
      });
      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({success: false, error: err.message}), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
    }
  }
};
```

---

## 📁 Estructura del Repo

```
formulario-FECSH/
├── index.html           # Formulario + auth gate
├── style.css            # Estilos UFRO/FECSH responsive
├── script.js            # Lógica completa
├── config.js            # URLs y configuración
├── .nojekyll            # Para GitHub Pages
├── README.md            # Documentación
├── apps-script/
│   └── Code.gs          # Apps Script backend (v5)
└── SESSION_BACKUP.md    # Este archivo
```

---

## 🔄 Para continuar en otro equipo

1. Clonar repo: `git clone https://github.com/nicolasvenegas/formAcadem-FECSH`
2. Verificar `config.js` tiene URLs correctas
3. Verificar Apps Script desplegado con código de `apps-script/Code.gs`
4. Verificar Cloudflare Worker activo
5. Verificar Google Sheet tiene 7 pestañas con headers
6. `git push` cualquier cambio → GitHub Pages auto-deploy

---

## 📝 Notas de la Sesión (31/08/2026)

- ✅ Formulario funcional con secciones colapsables
- ✅ Validación dominio @ufrontera.cl
- ✅ Rate limiting + honeypot anti-bot
- ✅ Escape de fórmulas Sheets (teléfono con +)
- ✅ Botones toggle minimalistas (+/×)
- ✅ Auth gate sin revelar dominio en placeholder
- ✅ Apps Script v5 desplegado
- ✅ Cloudflare Worker para CORS