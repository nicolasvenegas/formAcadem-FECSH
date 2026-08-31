const CONFIG = {
  SHEET_ID: '1MGr4dJvx-tqzuYsfILi36R55JKeUPamTuICxVtA14v4',
  AUTH_DOMAINS: ['@ufrontera.cl'],
  SHEET_NAMES: {
    perfil: 'Perfil',
    pregrados: 'Pregrados',
    magisteres: 'Magisteres',
    doctorados: 'Doctorados',
    proyectos: 'Proyectos',
    publicaciones: 'Publicaciones',
    libros: 'Libros'
  },
  RATE_LIMIT: {
    maxRequests: 5,
    windowMs: 3600000
  }
};

// Escape value for Google Sheets: prepend ' if starts with formula chars
function escapeForSheets(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === '') return '';
  // Chars that trigger formula interpretation in Sheets
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function doPost(e) {
  try {
    if (e && e.httpMethod === 'OPTIONS') {
      return ContentService.createTextOutput('');
    }
    
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({success: false, error: 'JSON inválido'});
    }
    
    const email = (data.perfil?.email || '').toLowerCase().trim();
    const honeypot = data.website || '';
    
    if (honeypot) {
      console.log(`Honeypot triggered: ${email}`);
      return jsonResponse({success: false, error: 'Error de validación'});
    }
    
    const cache = CacheService.getScriptCache();
    const rateKey = `ratelimit_${email}`;
    const currentCount = parseInt(cache.get(rateKey) || '0', 10);
    
    if (currentCount >= CONFIG.RATE_LIMIT.maxRequests) {
      console.log(`Rate limit exceeded: ${email}`);
      return jsonResponse({success: false, error: 'Demasiados envíos. Intente en 1 hora.'});
    }
    
    const autorizado = CONFIG.AUTH_DOMAINS.some(d => email.endsWith(d));
    if (!autorizado) {
      return jsonResponse({success: false, error: 'Solo correos @ufrontera.cl'});
    }
    
    const perfil = data.perfil || {};
    const pregrados = data.pregrados || [];
    
    if (!perfil.nombre || !perfil.email || !perfil.departamento || pregrados.length === 0) {
      return jsonResponse({success: false, error: 'Faltan campos obligatorios'});
    }
    
    cache.put(rateKey, String(currentCount + 1), Math.floor(CONFIG.RATE_LIMIT.windowMs / 1000));
    
    const submissionId = Utilities.getUuid();
    const timestamp = new Date();
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    const append = (sheetName, row) => {
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES[sheetName]);
      if (sheet) sheet.appendRow(row);
    };
    
    // Apply escapeForSheets to all values
    const escapeRow = (row) => row.map(escapeForSheets);
    
    append('perfil', escapeRow([
      submissionId, timestamp, perfil.nombre, perfil.email,
      perfil.telefono || '', perfil.departamento
    ]));
    
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
        const row = [submissionId, timestamp, ...fields.map(f => item[f] || '')];
        append(key, escapeRow(row));
      });
    });
    
    console.log(`SUBMIT_OK: ${email} | ${submissionId} | ${timestamp.toISOString()}`);
    
    return jsonResponse({success: true, id: submissionId});
    
  } catch (err) {
    console.error(`SUBMIT_ERROR: ${err.toString()}`);
    return jsonResponse({success: false, error: err.toString()});
  }
}

function doGet(e) {
  return jsonResponse({status: 'ok', message: 'FECSH Form API active'});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}