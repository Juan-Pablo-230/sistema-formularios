class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    init() {
        if (!authSystem.isAdmin()) return;
        this.configurarEventos();
        this.cargarClases();
    }

    configurarEventos() {
        document.getElementById('formClaseHistorica').onsubmit = (e) => {
            e.preventDefault();
            this.guardarClase();
        };

        document.getElementById('btnLimpiarForm').onclick = () => this.limpiarFormulario();
        document.getElementById('btnAgregarUrl').onclick = () => this.agregarCampoUrl();
        document.getElementById('btnGestionClasesVisual').onclick = () => this.mostrarSeccion();
    }

    // Genera campos de URL SIN el atributo 'required'
    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const id = 'url_' + Date.now();
        const div = document.createElement('div');
        div.className = 'url-entry';
        div.id = id;
        div.style = 'display: flex; gap: 5px; margin-bottom: 5px;';
        
        div.innerHTML = `
            <select class="url-tipo" style="width: 30%; padding: 5px; border-radius: 4px; background: var(--bg-container); color: var(--text-primary); border: 1px solid var(--border-color);">
                <option value="PDF" ${tipo === 'PDF' ? 'selected' : ''}>PDF</option>
                <option value="YouTube" ${tipo === 'YouTube' ? 'selected' : ''}>YouTube</option>
                <option value="Presentación" ${tipo === 'Presentación' ? 'selected' : ''}>PPT</option>
                <option value="Drive" ${tipo === 'Drive' ? 'selected' : ''}>Drive</option>
            </select>
            <input type="url" class="url-link" value="${link}" placeholder="https://..." 
                   style="flex: 1; padding: 5px; border-radius: 4px; background: var(--bg-container); color: var(--text-primary); border: 1px solid var(--border-color);">
            <button type="button" onclick="document.getElementById('${id}').remove()" style="background: none; border: none; cursor: pointer;">❌</button>
        `;
        container.appendChild(div);
    }

    async cargarClases() {
        try {
            const user = authSystem.getCurrentUser();
            const res = await fetch(`${this.apiBaseUrl}/clases-historicas`, { headers: { 'user-id': user._id } });
            const result = await res.json();
            if (result.success) {
                this.clases = result.data || [];
                this.renderizarLista();
            }
        } catch (e) { console.error("Error al cargar:", e); }
    }

    renderizarLista() {
        const container = document.getElementById('clasesListContainer');
        container.innerHTML = this.clases.sort((a,b) => new Date(b.fechaClase) - new Date(a.fechaClase)).map(c => {
            const estado = c.estado || (c.activa ? 'Activa' : 'Cancelada');
            const tieneMaterial = (c.urls && c.urls.length > 0) || (c.enlaces?.youtube || c.enlaces?.powerpoint);
            const visible = estado === 'Publicada' && tieneMaterial;

            return `
                <div style="background: var(--bg-container); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${c.nombre} ${visible ? '' : '🚫👁️'}</strong>
                        <div style="font-size: 0.8em; color: var(--text-muted);">
                            ${new Date(c.fechaClase).toLocaleDateString()} | <span style="color: ${visible ? '#34a853' : '#f9ab00'}">${estado}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-small" onclick="gestionVisual.cargarParaEditar('${c._id}')">✏️</button>
                        <button class="btn-small btn-danger" onclick="gestionVisual.eliminar('${c._id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    cargarParaEditar(id) {
        const c = this.clases.find(clase => clase._id === id);
        if (!c) return;

        this.limpiarFormulario();
        document.getElementById('claseIdEdit').value = c._id;
        document.getElementById('claseNombre').value = c.nombre;
        document.getElementById('claseDescripcion').value = c.descripcion || '';
        document.getElementById('claseInstructores').value = c.instructores?.join(', ') || '';
        document.getElementById('claseEstado').value = c.estado || (c.activa ? 'Activa' : 'Cancelada');
        
        const fecha = new Date(c.fechaClase);
        document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
        document.getElementById('claseHora').value = fecha.toTimeString().split(' ')[0].substring(0,5);

        if (c.urls?.length) {
            c.urls.forEach(u => this.agregarCampoUrl(u.tipo, u.link));
        } else if (c.enlaces) {
            if (c.enlaces.youtube) this.agregarCampoUrl('YouTube', c.enlaces.youtube);
            if (c.enlaces.powerpoint) this.agregarCampoUrl('Presentación', c.enlaces.powerpoint);
        }

        document.getElementById('tituloFormularioClase').innerText = '✏️ Editar Clase';
        document.getElementById('btnSubmitClase').innerText = '💾 Guardar Cambios';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async guardarClase() {
        const id = document.getElementById('claseIdEdit').value;
        const urls = Array.from(document.querySelectorAll('.url-entry')).map(entry => ({
            tipo: entry.querySelector('.url-tipo').value,
            link: entry.querySelector('.url-link').value.trim()
        })).filter(u => u.link !== "");

        const payload = {
            nombre: document.getElementById('claseNombre').value,
            descripcion: document.getElementById('claseDescripcion').value,
            fechaClase: `${document.getElementById('claseFecha').value}T${document.getElementById('claseHora').value}:00`,
            instructores: document.getElementById('claseInstructores').value.split(',').map(i => i.trim()).filter(i => i),
            estado: document.getElementById('claseEstado').value,
            urls: urls,
            enlaces: { 
                youtube: urls.find(u => u.tipo === 'YouTube')?.link || "",
                powerpoint: urls.find(u => u.tipo !== 'YouTube')?.link || ""
            },
            activa: document.getElementById('claseEstado').value !== 'Cancelada'
        };

        try {
            const user = authSystem.getCurrentUser();
            const url = `${this.apiBaseUrl}/clases-historicas${id ? '/' + id : ''}`;
            const res = await fetch(url, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                this.limpiarFormulario();
                await this.cargarClases();
                this.mostrarMensaje("✅ Guardado correctamente", "success");
            } else {
                this.mostrarMensaje("❌ Error: " + result.message, "error");
            }
        } catch (e) { this.mostrarMensaje("❌ Error de red", "error"); }
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseIdEdit').value = '';
        document.getElementById('urlsContainer').innerHTML = '';
        document.getElementById('tituloFormularioClase').innerText = '➕ Agregar Nueva Clase';
        document.getElementById('btnSubmitClase').innerText = '💾 Guardar Clase';
    }

    mostrarMensaje(txt, tipo) {
        const el = document.getElementById('formMensaje');
        el.innerText = txt;
        el.style.display = 'block';
        el.style.color = tipo === 'success' ? '#34a853' : '#ea4335';
        setTimeout(() => el.style.display = 'none', 3000);
    }

    async eliminar(id) {
        if (!confirm("¿Eliminar clase definitivamente?")) return;
        try {
            const user = authSystem.getCurrentUser();
            await fetch(`${this.apiBaseUrl}/clases-historicas/${id}`, { 
                method: 'DELETE', 
                headers: { 'user-id': user._id } 
            });
            this.cargarClases();
        } catch (e) { console.error(e); }
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(s => s.style.display = 'none');
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btnGestionClasesVisual').classList.add('active');
        this.cargarClases();
    }
}

// Inicialización
if (window.gestionVisual) delete window.gestionVisual;
window.gestionVisual = new GestionClasesVisual();