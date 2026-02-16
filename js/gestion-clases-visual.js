console.log('🎯 gestion-clases-visual.js cargado - Versión Instructores + Edición');

class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    async init() {
        if (!authSystem.isAdmin()) {
            alert('Solo administradores pueden acceder a esta sección');
            return;
        }
        this.configurarEventos();
        await this.cargarClases();
    }

    configurarEventos() {
        document.getElementById('formClaseHistorica').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarClase();
        });

        document.getElementById('btnLimpiarForm').addEventListener('click', () => this.limpiarFormulario());
        document.getElementById('btnRefrescarClases').addEventListener('click', () => this.cargarClases());
        document.getElementById('btnGestionClasesVisual').addEventListener('click', () => this.mostrarSeccion());
        
        const btnAgregarUrl = document.getElementById('btnAgregarUrl');
        if (btnAgregarUrl) {
            btnAgregarUrl.onclick = () => this.agregarCampoUrl();
        }
    }

    // --- MANEJO DE URLS ---
    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const div = document.createElement('div');
        div.className = 'url-entry';
        div.style = 'display: flex; gap: 10px; align-items: center;';
        div.innerHTML = `
            <select class="url-tipo" style="flex: 1; padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-container); color: var(--text-primary);">
                <option value="PDF" ${tipo === 'PDF' ? 'selected' : ''}>PDF</option>
                <option value="Presentación" ${tipo === 'Presentación' ? 'selected' : ''}>Presentación</option>
                <option value="YouTube" ${tipo === 'YouTube' ? 'selected' : ''}>YouTube</option>
                <option value="Drive" ${tipo === 'Drive' ? 'selected' : ''}>Drive</option>
            </select>
            <input type="url" class="url-link" value="${link}" placeholder="https://..." style="flex: 2; padding: 8px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-container); color: var(--text-primary);">
            <button type="button" class="btn-danger" onclick="this.parentElement.remove()" style="padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;">❌</button>
        `;
        container.appendChild(div);
    }

    obtenerUrlsDelFormulario() {
        const entries = document.querySelectorAll('.url-entry');
        const urls = [];
        entries.forEach(entry => {
            const tipo = entry.querySelector('.url-tipo').value;
            const link = entry.querySelector('.url-link').value.trim();
            if (link) urls.push({ tipo, link });
        });
        return urls;
    }

    // --- CARGA Y RENDER ---
    async cargarClases() {
        try {
            this.mostrarMensajeLista('Cargando clases...', 'info');
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, { headers: { 'user-id': user._id } });
            const result = await response.json();
            if (result.success) {
                this.clases = result.data || [];
                this.actualizarListaClases();
                this.actualizarEstadisticas();
            }
        } catch (error) {
            this.mostrarMensajeLista('Error al cargar clases', 'error');
        }
    }

    actualizarListaClases() {
        const container = document.getElementById('clasesListContainer');
        if (this.clases.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No hay clases cargadas</div>';
            return;
        }

        this.clases.sort((a, b) => new Date(b.fechaClase) - new Date(a.fechaClase));

        container.innerHTML = this.clases.map(clase => {
            const estado = clase.estado || (clase.activa ? 'Activa' : 'Cancelada');
            const tieneUrls = (clase.urls && clase.urls.length > 0) || (clase.enlaces?.youtube || clase.enlaces?.powerpoint);
            const esVisible = estado === 'Publicada' && tieneUrls;
            
            return `
                <div class="clase-card" style="background: var(--bg-container); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1.1em;">${clase.nombre} ${esVisible ? '' : '🚫👁️'}</strong>
                        <div style="font-size: 0.85em; color: var(--text-muted);">
                            <span>📅 ${new Date(clase.fechaClase).toLocaleDateString()}</span> | 
                            <span style="color: ${estado === 'Publicada' ? '#34a853' : (estado === 'Activa' ? '#f9ab00' : '#ea4335')}">${estado}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-small" style="background: var(--primary-500); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" onclick="gestionVisual.cargarParaEditar('${clase._id}')">✏️</button>
                        <button class="btn-small btn-danger" onclick="gestionVisual.eliminarClase('${clase._id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- MODO EDICIÓN ---
    cargarParaEditar(id) {
        const clase = this.clases.find(c => c._id === id);
        if (!clase) return;

        document.getElementById('claseIdEdit').value = clase._id;
        document.getElementById('claseNombre').value = clase.nombre;
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseEstado').value = clase.estado || (clase.activa ? 'Activa' : 'Cancelada');
        
        if(clase.fechaClase) {
            const d = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = d.toISOString().split('T')[0];
            document.getElementById('claseHora').value = d.toTimeString().split(' ')[0].substring(0,5);
        }

        const container = document.getElementById('urlsContainer');
        container.innerHTML = '';
        if (clase.urls && clase.urls.length > 0) {
            clase.urls.forEach(u => this.agregarCampoUrl(u.tipo, u.link));
        } else if (clase.enlaces) {
            if (clase.enlaces.youtube) this.agregarCampoUrl('YouTube', clase.enlaces.youtube);
            if (clase.enlaces.powerpoint) this.agregarCampoUrl('Presentación', clase.enlaces.powerpoint);
        }

        document.getElementById('tituloFormularioClase').innerText = '✏️ Editar Clase';
        document.getElementById('btnSubmitClase').innerText = '💾 Guardar cambios';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseIdEdit').value = '';
        document.getElementById('urlsContainer').innerHTML = '';
        document.getElementById('tituloFormularioClase').innerText = '➕ Agregar Nueva Clase';
        document.getElementById('btnSubmitClase').innerText = '💾 Guardar Clase';
    }

    // --- PERSISTENCIA ---
    async guardarClase() {
        try {
            const editId = document.getElementById('claseIdEdit').value;
            const urls = this.obtenerUrlsDelFormulario();
            const estado = document.getElementById('claseEstado').value;
            const instructoresStr = document.getElementById('claseInstructores').value;

            const claseData = {
                nombre: document.getElementById('claseNombre').value,
                descripcion: document.getElementById('claseDescripcion').value,
                fechaClase: `${document.getElementById('claseFecha').value}T${document.getElementById('claseHora').value || '10:00'}:00`,
                instructores: instructoresStr.split(',').map(i => i.trim()).filter(i => i !== ""),
                estado: estado,
                urls: urls,
                enlaces: { // Solución Error 400: enviamos strings para que el backend no falle
                    youtube: urls.find(u => u.tipo === 'YouTube')?.link || "",
                    powerpoint: urls.find(u => u.tipo !== 'YouTube')?.link || ""
                },
                activa: estado !== 'Cancelada'
            };

            const user = authSystem.getCurrentUser();
            const url = editId ? `${this.apiBaseUrl}/clases-historicas/${editId}` : `${this.apiBaseUrl}/clases-historicas`;
            const method = editId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                body: JSON.stringify(claseData)
            });

            const result = await response.json();
            if (result.success) {
                this.mostrarMensajeForm('✅ Guardado con éxito', 'success');
                this.limpiarFormulario();
                await this.cargarClases();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.mostrarMensajeForm('Error: ' + error.message, 'error');
        }
    }

    async eliminarClase(id) {
        if (!confirm('¿Eliminar esta clase?')) return;
        try {
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas/${id}`, {
                method: 'DELETE',
                headers: { 'user-id': user._id }
            });
            if ((await response.json()).success) {
                this.cargarClases();
            }
        } catch (e) { console.error(e); }
    }

    actualizarEstadisticas() {
        document.getElementById('statsTotalClases').textContent = this.clases.length;
        document.getElementById('statsClasesActivas').textContent = this.clases.filter(c => c.estado === 'Publicada').length;
    }

    mostrarMensajeForm(mensaje, tipo) {
        const msgDiv = document.getElementById('formMensaje');
        msgDiv.style.display = 'block';
        msgDiv.textContent = mensaje;
        msgDiv.style.color = tipo === 'success' ? '#34a853' : '#ea4335';
        setTimeout(() => msgDiv.style.display = 'none', 3000);
    }

    mostrarMensajeLista(m, t) {
        document.getElementById('clasesListContainer').innerHTML = `<div style="text-align:center;padding:20px;">${m}</div>`;
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(s => s.style.display = 'none');
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
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