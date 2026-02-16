class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    init() {
        if (typeof authSystem === 'undefined' || !authSystem.isAdmin()) return;
        this.configurarEventos();
        this.cargarClases();
    }

    configurarEventos() {
        const form = document.getElementById('formClaseHistorica');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.guardarClase();
        };

        document.getElementById('btnLimpiarForm').onclick = () => this.limpiarFormulario();
        document.getElementById('btnAgregarUrl').onclick = () => this.agregarCampoUrl();
        
        const navBtn = document.getElementById('btnGestionClasesVisual');
        if (navBtn) navBtn.onclick = () => this.mostrarSeccion();
    }

    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const id = 'url_' + Math.random().toString(36).substr(2, 9);
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
            <input type="text" class="url-link" value="${link}" placeholder="https://..." 
                   style="flex: 1; padding: 5px; border-radius: 4px; background: var(--bg-container); color: var(--text-primary); border: 1px solid var(--border-color);">
            <button type="button" onclick="document.getElementById('${id}').remove()" style="background: none; border: none; cursor: pointer;">❌</button>
        `;
        container.appendChild(div);
    }

    async cargarClases() {
        try {
            const user = authSystem.getCurrentUser();
            const res = await fetch(`${this.apiBaseUrl}/clases-historicas`, { 
                headers: { 'user-id': user._id, 'Cache-Control': 'no-cache' } 
            });
            const result = await res.json();
            if (result.success) {
                this.clases = result.data || [];
                this.renderizarLista();
            }
        } catch (e) { console.error("Error cargando clases:", e); }
    }

    renderizarLista() {
        const container = document.getElementById('clasesListContainer');
        if (!container) return;

        // Ordenamos por fecha descendente
        const sorted = [...this.clases].sort((a,b) => new Date(b.fechaClase) - new Date(a.fechaClase));

        container.innerHTML = sorted.map(c => {
            const estado = c.estado || (c.activa ? 'Activa' : 'Cancelada');
            const colorEstado = estado === 'Publicada' ? '#34a853' : (estado === 'Cancelada' ? '#ea4335' : '#f9ab00');

            return `
                <div style="background: var(--bg-container); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; ${estado === 'Cancelada' ? 'border-left: 5px solid #ea4335; opacity: 0.8;' : ''}">
                    <div>
                        <strong style="color: var(--text-primary)">${c.nombre}</strong>
                        <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">
                            📅 ${new Date(c.fechaClase).toLocaleDateString()} | 
                            <span style="font-weight: bold; color: ${colorEstado}">${estado.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
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
        document.getElementById('claseNombre').value = c.nombre || '';
        document.getElementById('claseDescripcion').value = c.descripcion || '';
        document.getElementById('claseInstructores').value = c.instructores ? c.instructores.join(', ') : '';
        document.getElementById('claseEstado').value = c.estado || (c.activa ? 'Activa' : 'Cancelada');
        
        if (c.fechaClase) {
            const fechaObj = new Date(c.fechaClase);
            document.getElementById('claseFecha').value = fechaObj.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fechaObj.toTimeString().split(' ')[0].substring(0,5);
        }

        const container = document.getElementById('urlsContainer');
        if (c.urls && c.urls.length > 0) {
            c.urls.forEach(u => this.agregarCampoUrl(u.tipo, u.link));
        } else if (c.enlaces) {
            if (c.enlaces.youtube) this.agregarCampoUrl('YouTube', c.enlaces.youtube);
            if (c.enlaces.powerpoint) this.agregarCampoUrl('Presentación', c.enlaces.powerpoint);
        }

        document.getElementById('tituloFormularioClase').innerText = '✏️ Editando: ' + c.nombre;
        document.getElementById('btnSubmitClase').innerText = '💾 Actualizar Clase';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async guardarClase() {
        const nombre = document.getElementById('claseNombre').value.trim();
        const fecha = document.getElementById('claseFecha').value;
        const hora = document.getElementById('claseHora').value;

        if (!nombre || !fecha) {
            this.mostrarMensaje("❌ Nombre y Fecha son obligatorios", "error");
            return;
        }

        const id = document.getElementById('claseIdEdit').value;
        const inputsUrl = Array.from(document.querySelectorAll('.url-entry'));
        const urls = inputsUrl.map(entry => ({
            tipo: entry.querySelector('.url-tipo').value,
            link: entry.querySelector('.url-link').value.trim()
        })).filter(u => u.link !== "");

        const estado = document.getElementById('claseEstado').value;

        const payload = {
            nombre: nombre,
            descripcion: document.getElementById('claseDescripcion').value.trim(),
            fechaClase: `${fecha}T${hora}:00`,
            instructores: document.getElementById('claseInstructores').value.split(',').map(i => i.trim()).filter(i => i),
            estado: estado,
            urls: urls,
            enlaces: { 
                youtube: urls.find(u => u.tipo === 'YouTube')?.link || "",
                powerpoint: urls.find(u => u.tipo !== 'YouTube')?.link || ""
            },
            activa: true // Siempre true para evitar que el backend la oculte por filtro
        };

        try {
            const user = authSystem.getCurrentUser();
            const method = id ? 'PUT' : 'POST';
            const endpoint = `${this.apiBaseUrl}/clases-historicas${id ? '/' + id : ''}`;

            const res = await fetch(endpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                this.mostrarMensaje("✅ Clase guardada con éxito", "success");
                this.limpiarFormulario();
                await this.cargarClases();
            } else {
                this.mostrarMensaje("❌ Error: " + (result.message || "No se pudo guardar"), "error");
            }
        } catch (e) {
            this.mostrarMensaje("❌ Error de conexión con el servidor", "error");
        }
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
        el.style.backgroundColor = tipo === 'success' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(234, 67, 53, 0.2)';
        el.style.color = tipo === 'success' ? '#34a853' : '#ea4335';
        setTimeout(() => el.style.display = 'none', 4000);
    }

    async eliminar(id) {
        if (!confirm("¿Seguro que deseas eliminar esta clase de forma permanente?")) return;
        try {
            const user = authSystem.getCurrentUser();
            const res = await fetch(`${this.apiBaseUrl}/clases-historicas/${id}`, { 
                method: 'DELETE', 
                headers: { 'user-id': user._id } 
            });
            const result = await res.json();
            if (result.success) this.cargarClases();
        } catch (e) { console.error("Error al eliminar:", e); }
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(s => s.style.display = 'none');
        const section = document.getElementById('gestionClasesVisualSection');
        if (section) section.style.display = 'block';
        
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('btnGestionClasesVisual');
        if (btn) btn.classList.add('active');
        
        this.cargarClases();
    }
}

// Reiniciar instancia global
window.gestionVisual = new GestionClasesVisual();