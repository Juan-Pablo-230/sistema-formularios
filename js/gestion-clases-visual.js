console.log('🎯 gestion-clases-visual.js cargado');

class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando gestión visual de clases...');
        
        if (!authSystem.isAdmin()) {
            alert('Solo administradores pueden acceder a esta sección');
            return;
        }

        this.configurarEventos();
        await this.cargarClases();
    }

    configurarEventos() {
        // Formulario de creación/edición
        document.getElementById('formClaseHistorica').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarClase();
        });

        // Botón limpiar formulario / cancelar edición
        document.getElementById('btnLimpiarForm').addEventListener('click', () => {
            this.limpiarFormulario();
        });

        // Botón refrescar
        document.getElementById('btnRefrescarClases').addEventListener('click', () => {
            this.cargarClases();
        });

        // Botón en navegación principal
        document.getElementById('btnGestionClasesVisual').addEventListener('click', () => {
            this.mostrarSeccion();
        });

        // Botón para agregar nueva URL dinámica
        const btnAgregarUrl = document.getElementById('btnAgregarUrl');
        if (btnAgregarUrl) {
            btnAgregarUrl.addEventListener('click', () => {
                this.agregarCampoUrl();
            });
        }
    }

    // --- LÓGICA DE URLS DINÁMICAS ---
    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const idUnico = 'url_' + Date.now() + Math.floor(Math.random() * 1000);
        
        const entryHtml = `
            <div class="url-entry" id="${idUnico}" style="display: flex; gap: 10px; align-items: flex-start; animation: fadeIn 0.3s ease;">
                <select class="url-tipo" style="flex: 1; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-container); color: var(--text-primary);">
                    <option value="PDF" ${tipo === 'PDF' ? 'selected' : ''}>PDF</option>
                    <option value="Presentación" ${tipo === 'Presentación' ? 'selected' : ''}>Presentación</option>
                    <option value="YouTube" ${tipo === 'YouTube' ? 'selected' : ''}>YouTube</option>
                    <option value="Drive" ${tipo === 'Drive' ? 'selected' : ''}>Drive</option>
                    <option value="Otro" ${tipo === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
                <input type="url" class="url-link" value="${link}" placeholder="https://..." style="flex: 2; padding: 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-container); color: var(--text-primary);">
                <button type="button" class="btn-small btn-danger" onclick="document.getElementById('${idUnico}').remove()" style="padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
                    ❌
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', entryHtml);
    }

    obtenerUrlsDelFormulario() {
        const urls = [];
        document.querySelectorAll('.url-entry').forEach(entry => {
            const tipo = entry.querySelector('.url-tipo').value;
            const link = entry.querySelector('.url-link').value.trim();
            if (link) { // Solo guardamos si el link no está vacío
                urls.push({ tipo, link });
            }
        });
        return urls;
    }
    // ----------------------------------

    async cargarClases() {
        try {
            this.mostrarMensajeLista('Cargando clases...', 'info');
            
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                headers: {
                    'user-id': user._id
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.clases = result.data || [];
                this.actualizarListaClases();
                this.actualizarEstadisticas();
                console.log(`✅ ${this.clases.length} clases cargadas`);
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error cargando clases:', error);
            this.mostrarMensajeLista('Error al cargar clases', 'error');
        }
    }

    actualizarListaClases() {
        const container = document.getElementById('clasesListContainer');
        
        if (this.clases.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    📭 No hay clases históricas cargadas
                </div>
            `;
            return;
        }

        // Ordenar por fecha (más reciente primero)
        this.clases.sort((a, b) => new Date(b.fechaClase) - new Date(a.fechaClase));

        let html = '';
        this.clases.forEach(clase => {
            const fecha = clase.fechaClase ? new Date(clase.fechaClase).toLocaleDateString('es-AR') : 'Sin fecha';
            
            // Retrocompatibilidad y estado
            const estado = clase.estado || (clase.activa !== false ? 'Activa' : 'Cancelada');
            
            // Armar lista de URLs para validar y renderizar
            let urlsList = clase.urls || [];
            if (urlsList.length === 0 && clase.enlaces) { // Compatibilidad con clases viejas
                if (clase.enlaces.youtube) urlsList.push({tipo: 'YouTube', link: clase.enlaces.youtube});
                if (clase.enlaces.powerpoint) urlsList.push({tipo: 'Presentación', link: clase.enlaces.powerpoint});
            }

            // Lógica de visibilidad
            const esVisible = estado === 'Publicada' && urlsList.length > 0;
            const iconoOculto = esVisible ? '' : ' <span title="No visible para usuarios">🚫👁️</span>';
            
            // Renderizado de colores según estado
            let colorEstado = '#f9ab00'; // Activa (Amarillo)
            if (estado === 'Publicada') colorEstado = '#34a853'; // Verde
            if (estado === 'Cancelada') colorEstado = '#ea4335'; // Rojo

            // Render html de URLs
            let htmlUrls = urlsList.map(u => `<span title="${u.tipo}">🔗 ${u.tipo}: ${this.acortarUrl(u.link)}</span>`).join('<br>');
            if(!htmlUrls) htmlUrls = '<em>Sin material cargado</em>';

            html += `
                <div class="clase-card" data-id="${clase._id}" style="
                    background: var(--bg-container);
                    border: 2px solid ${esVisible ? 'var(--success-500)' : 'var(--border-color)'};
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onclick="gestionVisual.cargarClaseParaEdicion('${clase._id}')">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="font-weight: bold; color: var(--text-primary);">${clase.nombre}${iconoOculto}</span>
                                <span style="font-size: 0.8em; padding: 2px 8px; border-radius: 12px; background: ${colorEstado}; color: white;">
                                    ${estado}
                                </span>
                            </div>
                            <div style="font-size: 0.85em; color: var(--text-muted); margin-bottom: 5px;">
                                📅 ${fecha}
                            </div>
                            <div style="font-size: 0.85em; color: var(--text-secondary);">
                                ${htmlUrls}
                            </div>
                            ${clase.instructores && clase.instructores.length > 0 ? `
                                <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 5px;">
                                    👥 ${clase.instructores.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-small" style="background-color: var(--accent-color); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor:pointer;" onclick="event.stopPropagation(); gestionVisual.cargarClaseParaEdicion('${clase._id}')" title="Editar Clase">
                                ✏️
                            </button>
                            <button class="btn-small btn-danger" onclick="event.stopPropagation(); gestionVisual.eliminarClase('${clase._id}')" style="border: none; padding: 5px 10px; border-radius: 4px; cursor:pointer;" title="Eliminar Clase">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    acortarUrl(url) {
        if (!url) return 'No disponible';
        if (url.length > 25) {
            return url.substring(0, 22) + '...';
        }
        return url;
    }

    cargarClaseParaEdicion(claseId) {
        const clase = this.clases.find(c => c._id === claseId);
        if (!clase) return;

        // Llenar formulario básico
        document.getElementById('claseIdEdit').value = clase._id;
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            // Asegurar formato HH:mm
            const horas = String(fecha.getHours()).padStart(2, '0');
            const mins = String(fecha.getMinutes()).padStart(2, '0');
            document.getElementById('claseHora').value = `${horas}:${mins}`;
        }
        
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        
        // Manejar estado (retrocompatibilidad)
        const estado = clase.estado || (clase.activa !== false ? 'Activa' : 'Cancelada');
        document.getElementById('claseEstado').value = estado;

        // Limpiar contenedor de URLs y cargar las existentes
        document.getElementById('urlsContainer').innerHTML = '';
        let urlsList = clase.urls || [];
        
        if (urlsList.length === 0 && clase.enlaces) {
            if (clase.enlaces.youtube) urlsList.push({tipo: 'YouTube', link: clase.enlaces.youtube});
            if (clase.enlaces.powerpoint) urlsList.push({tipo: 'Presentación', link: clase.enlaces.powerpoint});
        }

        urlsList.forEach(u => this.agregarCampoUrl(u.tipo, u.link));

        // Cambiar interfaz visual para "Modo Edición"
        document.getElementById('tituloFormularioClase').innerHTML = '✏️ Editar Clase Histórica';
        document.getElementById('btnSubmitClase').innerHTML = '💾 Guardar cambios';
        
        // Scroll al formulario
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseIdEdit').value = '';
        document.getElementById('urlsContainer').innerHTML = ''; // Vaciar URLs
        document.getElementById('claseEstado').value = 'Activa';
        
        // Restaurar interfaz visual para "Modo Creación"
        document.getElementById('tituloFormularioClase').innerHTML = '➕ Agregar Nueva Clase';
        document.getElementById('btnSubmitClase').innerHTML = '💾 Guardar Clase';
        
        this.mostrarMensajeForm('Formulario limpiado', 'info');
    }

    async guardarClase() {
        try {
            const editId = document.getElementById('claseIdEdit').value;
            const esEdicion = editId !== '';

            // Recoger datos
            const nombre = document.getElementById('claseNombre').value.trim();
            const descripcion = document.getElementById('claseDescripcion').value.trim();
            const fecha = document.getElementById('claseFecha').value;
            const hora = document.getElementById('claseHora').value || '10:00';
            const instructoresStr = document.getElementById('claseInstructores').value;
            const estado = document.getElementById('claseEstado').value;
            
            // Obtener URLs dinámicas
            const urls = this.obtenerUrlsDelFormulario();

            // Validaciones
            if (!nombre) {
                this.mostrarMensajeForm('El nombre de la clase es obligatorio', 'error');
                return;
            }
            if (!fecha) {
                this.mostrarMensajeForm('La fecha de la clase es obligatoria', 'error');
                return;
            }

            // Crear objeto fecha
            const fechaClase = new Date(`${fecha}T${hora}:00`);

            // Procesar instructores
            const instructores = instructoresStr
                ? instructoresStr.split(',').map(i => i.trim()).filter(i => i)
                : [];

            // Objeto de la clase (compatible con nueva lógica)
            const claseData = {
                nombre,
                descripcion,
                fechaClase: fechaClase.toISOString(),
                estado,          // Nuevo campo "Activa", "Publicada", "Cancelada"
                urls,            // Nuevo array de objetos [{tipo, link}]
                enlaces: {},     // Se envía vacío por compatibilidad si la DB es estricta
                activa: estado !== 'Cancelada', // Retrocompatibilidad
                instructores,
                tags: this.generarTags(nombre)
            };

            const user = authSystem.getCurrentUser();
            let response;
            let mensaje;

            if (esEdicion) {
                // Actualizar
                response = await fetch(`${this.apiBaseUrl}/clases-historicas/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                    body: JSON.stringify(claseData)
                });
                mensaje = '✅ Cambios guardados correctamente';
            } else {
                // Crear
                response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                    body: JSON.stringify(claseData)
                });
                mensaje = '✅ Clase creada correctamente';
            }

            const result = await response.json();

            if (result.success) {
                this.mostrarMensajeForm(mensaje, 'success');
                this.limpiarFormulario(); // Limpia y restaura al modo Creación
                await this.cargarClases();
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('❌ Error guardando clase:', error);
            this.mostrarMensajeForm('Error: ' + error.message, 'error');
        }
    }

    async eliminarClase(claseId) {
        if (!confirm('¿Estás seguro de eliminar esta clase? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas/${claseId}`, {
                method: 'DELETE',
                headers: {
                    'user-id': user._id
                }
            });

            const result = await response.json();

            if (result.success) {
                this.mostrarMensajeForm('✅ Clase eliminada', 'success');
                await this.cargarClases();
                
                // Si justo estaba editando la clase que borró, limpiar
                if (document.getElementById('claseIdEdit').value === claseId) {
                    this.limpiarFormulario();
                }
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('❌ Error eliminando clase:', error);
            this.mostrarMensajeForm('Error al eliminar: ' + error.message, 'error');
        }
    }

    generarTags(nombre) {
        const palabras = nombre.toLowerCase().split(' ');
        return palabras.filter(p => p.length > 3);
    }

    async actualizarEstadisticas() {
        try {
            document.getElementById('statsTotalClases').textContent = this.clases.length;
            
            // Filtro por Publicadas/Activas
            const publicadas = this.clases.filter(c => c.estado === 'Publicada').length;
            document.getElementById('statsClasesActivas').textContent = publicadas;
            
            const hoy = new Date();
            const mesProximo = new Date();
            mesProximo.setDate(mesProximo.getDate() + 30);
            
            const proximas = this.clases.filter(c => {
                if (!c.fechaClase) return false;
                const fechaClase = new Date(c.fechaClase);
                return fechaClase >= hoy && fechaClase <= mesProximo;
            }).length;
            document.getElementById('statsClasesProximas').textContent = proximas;
            
            if (window.adminSystem) {
                document.getElementById('statsTotalSolicitudesHistorico').textContent = 
                    window.adminSystem.solicitudesMaterialHistoricoData?.length || 0;
            }
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    mostrarMensajeForm(mensaje, tipo) {
        const msgDiv = document.getElementById('formMensaje');
        msgDiv.style.display = 'block';
        msgDiv.textContent = mensaje;
        
        const colores = {
            success: '#34a853',
            error: '#ea4335',
            info: '#4285f4'
        };
        
        msgDiv.style.backgroundColor = colores[tipo] + '20';
        msgDiv.style.color = colores[tipo];
        msgDiv.style.border = `2px solid ${colores[tipo]}`;
        
        setTimeout(() => {
            msgDiv.style.display = 'none';
        }, 5000);
    }

    mostrarMensajeLista(mensaje, tipo) {
        const container = document.getElementById('clasesListContainer');
        const colores = { info: '#4285f4', error: '#ea4335' };
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: ${colores[tipo]};">${mensaje}</div>`;
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(section => section.style.display = 'none');
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('btnGestionClasesVisual').classList.add('active');
        this.cargarClases();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkAuth = setInterval(() => {
        if (typeof authSystem !== 'undefined' && authSystem.isLoggedIn()) {
            clearInterval(checkAuth);
            window.gestionVisual = new GestionClasesVisual();
        }
    }, 100);
});