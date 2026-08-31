/**
 * Formulario Académicos FECSH - Lógica Principal
 * Universidad de La Frontera
 */

(() => {
  'use strict';

  // ===================================
  // Configuración y Estado
  // ===================================
  const CONFIG = window.FECSH_CONFIG || {};
  const AUTH_DOMAINS = CONFIG.AUTH_DOMAINS || ['@ufrontera.cl'];
  const APPS_SCRIPT_URL = CONFIG.APPS_SCRIPT_URL || '';
  
  // Elementos DOM (se inicializan en init())
  let authGate, authForm, authEmail, authError, mainForm;
  let emailInput, submissionIdInput, submitBtn, resetBtn, btnLoading, btnText, toastContainer;
  
  function getDOMElements() {
    authGate = document.getElementById('auth-gate');
    authForm = document.getElementById('auth-form');
    authEmail = document.getElementById('auth-email');
    authError = document.getElementById('auth-email-error'); // ID real en HTML
    mainForm = document.getElementById('main-form');
    emailInput = document.getElementById('email');
    submissionIdInput = document.getElementById('submission-id');
    submitBtn = document.getElementById('submit-btn');
    resetBtn = document.getElementById('reset-btn');
    btnLoading = submitBtn?.querySelector('.btn-loading');
    btnText = submitBtn?.querySelector('.btn-text');
    toastContainer = document.getElementById('toast-container');
    
    console.log('DOM Elements:', { authGate, authForm, authEmail, authError, mainForm, emailInput, submitBtn, resetBtn, toastContainer });
  }

  // Secciones dinámicas
  const DYNAMIC_SECTIONS = [
    { id: 'pregrados', container: 'pregrados-container', template: 'pregrado-template', min: 1 },
    { id: 'magisteres', container: 'magisteres-container', template: 'magister-template', min: 0 },
    { id: 'doctorados', container: 'doctorados-container', template: 'doctorado-template', min: 0 },
    { id: 'proyectos', container: 'proyectos-container', template: 'proyecto-template', min: 0 },
    { id: 'publicaciones', container: 'publicaciones-container', template: 'publicacion-template', min: 0 },
    { id: 'libros', container: 'libros-container', template: 'libro-template', min: 0 }
  ];

  // ===================================
  // Utilidades
  // ===================================
  const utils = {
    // Generar UUID v4
    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // Validar email dominio
    isValidDomain(email) {
      const lower = email.toLowerCase().trim();
      return AUTH_DOMAINS.some(domain => lower.endsWith(domain));
    },

    // Sanitizar string para CSV/Sheets
    sanitize(str) {
      if (str === null || str === undefined) return '';
      return String(str).trim().replace(/[\r\n]+/g, ' ').replace(/["']/g, '');
    },

    // Debounce
    debounce(fn, delay) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    // Mostrar/ocultar elementos
    show(el) { 
      if (!el) return; 
      el.hidden = false; 
      el.style.display = ''; 
      el.classList.remove('form-hidden'); 
    },
    hide(el) { 
      if (!el) return; 
      el.hidden = true; 
      el.style.display = 'none'; 
      el.classList.add('form-hidden'); 
    },

    // Obtener datos de formulario como objeto
    formToObject(form) {
      const data = {};
      const formData = new FormData(form);
      
      for (const [key, value] of formData.entries()) {
        const keys = key.match(/^(\w+)(?:\[(\w+)\])?(?:\[(\w+)\])?$/);
        if (!keys) continue;
        
        const [, section, field, subField] = keys;
        
        if (!data[section]) data[section] = {};
        
        if (subField) {
          // Array de objetos (secciones dinámicas con múltiples campos)
          if (!data[section][field]) data[section][field] = [];
          // Para checkboxes múltiples
          if (field.endsWith('[]')) {
            const cleanField = field.slice(0, -2);
            if (!data[section][cleanField]) data[section][cleanField] = [];
            data[section][cleanField].push(value);
          }
        } else if (field) {
          // Objeto simple (perfil)
          data[section][field] = value;
        } else {
          // Campo raíz (submission_id)
          data[section] = value;
        }
      }
      
      // Procesar secciones dinámicas (arrays de objetos)
      DYNAMIC_SECTIONS.forEach(section => {
        const sectionData = [];
        const rows = document.querySelectorAll(`#${section.container} .dynamic-row`);
        rows.forEach(row => {
          const rowData = {};
          const inputs = row.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            const name = input.name;
            const match = name.match(/^(\w+)\[\]\[(\w+)\]$/);
            if (match) {
              const [, , field] = match;
              rowData[field] = utils.sanitize(input.value);
            }
          });
          // Solo agregar si tiene al menos un campo con valor
          if (Object.values(rowData).some(v => v !== '')) {
            sectionData.push(rowData);
          }
        });
        if (sectionData.length > 0) {
          data[section.id] = sectionData;
        }
      });
      
      return data;
    }
  };

  // ===================================
  // Toast Notifications
  // ===================================
  const toast = {
    show(message, type = 'info', title = '', duration = 5000) {
      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${type}`;
      toastEl.setAttribute('role', 'alert');
      toastEl.setAttribute('aria-live', 'polite');
      
      const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };
      
      const titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
      };
      
      toastEl.innerHTML = `
        <div class="toast-icon" style="color: ${type === 'success' ? '#059669' : type === 'error' ? '#DC2626' : type === 'warning' ? '#D97706' : '#0284C7'}">${icons[type]}</div>
        <div class="toast-content">
          <div class="toast-title">${title || titles[type]}</div>
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Cerrar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      `;
      
      toastContainer.appendChild(toastEl);
      
      // Auto-remove
      const remove = () => {
        toastEl.classList.add('removing');
        toastEl.addEventListener('animationend', () => toastEl.remove());
      };
      
      toastEl.querySelector('.toast-close').addEventListener('click', remove);
      setTimeout(remove, duration);
    }
  };

  // ===================================
  // Validación
  // ===================================
  const validator = {
    validateField(input) {
      const group = input.closest('.form-group');
      if (!group) return true;
      
      let valid = true;
      const value = input.value.trim();
      
      // Required
      if (input.required && !value) {
        valid = false;
      }
      
      // Email format
      if (valid && input.type === 'email' && value) {
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      
      // Number range
      if (valid && input.type === 'number' && value) {
        const min = parseInt(input.min, 10);
        const max = parseInt(input.max, 10);
        const num = parseInt(value, 10);
        if (isNaN(num) || (min && num < min) || (max && num > max)) {
          valid = false;
        }
      }
      
      // Update UI
      group.classList.toggle('has-error', !valid);
      const errorEl = group.querySelector('.error-message');
      if (errorEl) errorEl.classList.toggle('visible', !valid);
      
      return valid;
    },
    
    validateForm(form) {
      const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
      let allValid = true;
      let firstInvalid = null;
      
      inputs.forEach(input => {
        const valid = this.validateField(input);
        if (!valid && !firstInvalid) {
          firstInvalid = input;
        }
        allValid = allValid && valid;
      });
      
      // Validar mínimo 1 pregrado
      const pregradoRows = document.querySelectorAll('#pregrados-container .dynamic-row');
      let hasValidPregrado = false;
      pregradoRows.forEach(row => {
        const inputs = row.querySelectorAll('input[required]');
        const rowValid = Array.from(inputs).every(i => i.value.trim() !== '');
        if (rowValid) hasValidPregrado = true;
      });
      
      if (!hasValidPregrado) {
        allValid = false;
        const container = document.getElementById('pregrados-container');
        const firstRow = container.querySelector('.dynamic-row');
        if (firstRow) {
          const firstRequired = firstRow.querySelector('input[required]');
          if (firstRequired) {
            this.validateField(firstRequired);
            if (!firstInvalid) firstInvalid = firstRequired;
          }
        }
      }
      
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      return allValid;
    },
    
    // Real-time validation
    initLiveValidation(form) {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', utils.debounce(() => this.validateField(input), 300));
      });
    }
  };

  // ===================================
  // Secciones Dinámicas
  // ===================================
  const dynamicSections = {
    init() {
      DYNAMIC_SECTIONS.forEach(section => {
        // Solo auto-agregar fila si es obligatoria (min > 0)
        if (section.min > 0) {
          this.addRow(section.id);
        }
        
        // Botón agregar/toggle
        const addBtn = document.querySelector(`[data-section="${section.id}"].btn-add`);
        if (addBtn) {
          if (section.min === 0 && addBtn.dataset.action === 'toggle') {
            // Sección colapsable: click hace toggle
            addBtn.addEventListener('click', () => this.toggleSection(section.id));
          } else {
            // Sección normal: click agrega fila
            addBtn.addEventListener('click', () => this.addRow(section.id));
          }
        }
      });
    },
    
    toggleSection(sectionId) {
      const section = DYNAMIC_SECTIONS.find(s => s.id === sectionId);
      if (!section) return;
      
      const container = document.getElementById(section.container);
      const sectionEl = container.closest('.collapsible-section');
      
      if (container.hidden) {
        // Mostrar sección
        container.hidden = false;
        sectionEl.classList.add('expanded');
        // Si no hay filas, agregar una
        const rows = container.querySelectorAll('.dynamic-row');
        if (rows.length === 0) {
          this.addRow(sectionId);
        }
      } else {
        // Ocultar sección si no hay filas con datos
        const rows = container.querySelectorAll('.dynamic-row');
        const hasData = Array.from(rows).some(row => {
          const inputs = row.querySelectorAll('input, select, textarea');
          return Array.from(inputs).some(input => input.value.trim() !== '');
        });
        
        if (!hasData) {
          container.hidden = true;
          sectionEl.classList.remove('expanded');
          // Limpiar filas vacías
          rows.forEach(row => row.remove());
          this.updateRemoveButtons(sectionId);
        } else {
          toast.show('Elimine los datos primero para colapsar la sección', 'info');
        }
      }
    },
    
    addRow(sectionId) {
      const section = DYNAMIC_SECTIONS.find(s => s.id === sectionId);
      if (!section) return;
      
      const container = document.getElementById(section.container);
      const template = document.getElementById(section.template);
      if (!container || !template) return;
      
      // Mostrar contenedor si está oculto (para secciones colapsables)
      if (container.hidden) {
        container.hidden = false;
        const sectionEl = container.closest('.collapsible-section');
        if (sectionEl) sectionEl.classList.add('expanded');
      }
      
      const clone = template.content.cloneNode(true);
      const row = clone.querySelector('.dynamic-row');
      
      // Agregar event listener al botón eliminar
      const removeBtn = row.querySelector('.btn-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.removeRow(row, sectionId));
      }
      
      // Agregar validación en vivo a los nuevos inputs
      const inputs = row.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => validator.validateField(input));
        input.addEventListener('input', utils.debounce(() => validator.validateField(input), 300));
      });
      
      container.appendChild(clone);
      this.updateRemoveButtons(sectionId);
      
      return row;
    },
    
    removeRow(row, sectionId) {
      const section = DYNAMIC_SECTIONS.find(s => s.id === sectionId);
      if (!section) return;
      
      const container = document.getElementById(section.container);
      const rows = container.querySelectorAll('.dynamic-row');
      
      if (rows.length <= section.min) {
        toast.show(`Debe mantener al menos ${section.min} ${section.id.slice(0, -1)}`, 'warning');
        return;
      }
      
      row.classList.add('removing');
      row.addEventListener('animationend', () => {
        row.remove();
        this.updateRemoveButtons(sectionId);
        
        // Para secciones colapsables, ocultar si no quedan filas
        if (section.min === 0) {
          const remainingRows = container.querySelectorAll('.dynamic-row');
          if (remainingRows.length === 0) {
            container.hidden = true;
            const sectionEl = container.closest('.collapsible-section');
            if (sectionEl) sectionEl.classList.remove('expanded');
          }
        }
      }, { once: true });
    },
    
    updateRemoveButtons(sectionId) {
      const section = DYNAMIC_SECTIONS.find(s => s.id === sectionId);
      if (!section) return;
      
      const container = document.getElementById(section.container);
      const rows = container.querySelectorAll('.dynamic-row');
      
      rows.forEach((row, index) => {
        const removeBtn = row.querySelector('.btn-remove');
        if (removeBtn) {
          if (rows.length > section.min) {
            removeBtn.hidden = false;
          } else {
            removeBtn.hidden = true;
          }
        }
      });
    }
  };

  // ===================================
  // Autenticación
  // ===================================
  const auth = {
    init() {
      authForm.addEventListener('submit', (e) => this.handleSubmit(e));
    },
    
    handleSubmit(e) {
      e.preventDefault();
      
      const email = authEmail.value.trim().toLowerCase();
      authError.hidden = true;
      authError.textContent = '';
      
      if (!email) {
        this.showError('Ingrese su correo electrónico');
        return;
      }
      
      if (!utils.isValidDomain(email)) {
        this.showError('Solo se permiten correos institucionales @ufrontera.cl');
        return;
      }
      
      // Éxito - mostrar formulario principal
      this.showMainForm(email);
    },
    
    showError(message) {
      authError.textContent = message;
      authError.hidden = false;
      authEmail.focus();
    },
    
    showMainForm(email) {
      utils.hide(authGate);
      utils.show(mainForm);
      
      // Pre-llenar email y hacerlo readonly
      emailInput.value = email;
      emailInput.readOnly = true;
      
      // Generar submission ID
      submissionIdInput.value = utils.generateUUID();
      
      // Inicializar resto
      dynamicSections.init();
      validator.initLiveValidation(mainForm);
      this.bindFormEvents();
      
      // Scroll suave al formulario
      mainForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      toast.show('Acceso concedido. Complete el formulario.', 'success');
    },
    
    bindFormEvents() {
      // Submit
      mainForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
      
      // Reset
      resetBtn.addEventListener('click', () => this.resetForm());
    },
    
    async handleFormSubmit(e) {
      e.preventDefault();
      
      if (!validator.validateForm(mainForm)) {
        toast.show('Por favor complete los campos obligatorios', 'error');
        return;
      }
      
      // Loading state
      submitBtn.disabled = true;
      utils.hide(btnText);
      utils.show(btnLoading);
      
      try {
        const formData = utils.formToObject(mainForm);
        const result = await this.submitToAppsScript(formData);
        
        if (result.success) {
          toast.show(`Formulario enviado correctamente. ID: ${result.id}`, 'success', 'Enviado', 8000);
          this.resetForm();
        } else {
          throw new Error(result.error || 'Error desconocido del servidor');
        }
      } catch (error) {
        console.error('Submit error:', error);
        toast.show(`Error al enviar: ${error.message}`, 'error', 'Error', 8000);
      } finally {
        submitBtn.disabled = false;
        utils.show(btnText);
        utils.hide(btnLoading);
      }
    },
    
    async submitToAppsScript(data) {
      const payload = {
        perfil: {
          nombre: data.perfil?.nombre || '',
          email: data.perfil?.email || '',
          telefono: data.perfil?.telefono || '',
          departamento: data.perfil?.departamento || ''
        },
        pregrados: data.pregrados || [],
        magisteres: data.magisteres || [],
        doctorados: data.doctorados || [],
        proyectos: data.proyectos || [],
        publicaciones: data.publicaciones || [],
        libros: data.libros || [],
        submission_id: data.submission_id || utils.generateUUID()
      };
      
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    
    resetForm() {
      mainForm.reset();
      
      // Limpiar secciones dinámicas (mantener mínimo)
      DYNAMIC_SECTIONS.forEach(section => {
        const container = document.getElementById(section.container);
        const rows = container.querySelectorAll('.dynamic-row');
        
        // Remover filas extras
        for (let i = section.min; i < rows.length; i++) {
          rows[i].remove();
        }
        
        // Limpiar primera fila
        if (rows[0]) {
          const inputs = rows[0].querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            if (input.type === 'checkbox') {
              input.checked = false;
            } else {
              input.value = '';
            }
          });
        }
        
        dynamicSections.updateRemoveButtons(section.id);
      });
      
      // Limpiar validación
      document.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
      document.querySelectorAll('.error-message.visible').forEach(e => e.classList.remove('visible'));
      
      // Nuevo submission ID
      submissionIdInput.value = utils.generateUUID();
      
      // Scroll al inicio
      mainForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      toast.show('Formulario limpiado', 'info');
    }
  };

  // ===================================
  // Inicialización
  // ===================================
  function init() {
    getDOMElements();
    
    // Verificar que tenemos la URL del Apps Script
    if (!APPS_SCRIPT_URL) {
      console.error('APPS_SCRIPT_URL no configurada en config.js');
      toast.show('Error de configuración: falta URL del backend', 'error');
      return;
    }
    
    if (!authForm) {
      console.error('authForm no encontrado en el DOM');
      return;
    }
    
    auth.init();
    
    // Prevenir envío con Enter en campos de texto (excepto textarea)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
        const form = e.target.closest('form');
        if (form && form.id === 'main-form') {
          e.preventDefault();
        }
      }
    });
    
    console.log('Formulario FECSH inicializado');
  }

  // Iniciar cuando DOM listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();