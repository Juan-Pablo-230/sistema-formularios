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
        document.getElementById('formClaseHistorica').onsubmit = (e) => {
            e.preventDefault();
            this.guardarClase();
        };

        document.getElementById('btnLimpiarForm').onclick = () => this.limpiarFormulario();
        document.getElementById('btnAgregarUrl').onclick = () => this.agregarCampoUrl();
        document.getElementById('btnRefrescarClases').onclick = () => this.cargarClases();
        
        const navBtn = document.getElementById('btnGestionClasesVisual');
        if (navBtn) navBtn.onclick = () => this.mostrarSeccion();
    }

    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const id = 'url_' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.style = 'display: flex; gap: 5px;';
        div.innerHTML = `
            <select class="url-tipo" style="width: 30%; background: var(--bg-container); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                <option value="PDF" ${tipo === 'PDF' ? 'selected' : ''}>PDF</option>
                <option value="YouTube" ${tipo === 'YouTube' ? 'selected' : ''}>YouTube</option>
                <option value="Presentación" ${tipo === 'Presentación' ? 'selected' : ''}>PPT</option>
            </select>
            <input type="text" class="url-link" value="${link}" placeholder="Enlace..." style="flex: 1; background: var(--bg-container); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 5px;">
            <button type="button" onclick="document.getElementById('${id}').remove()" style="background:none; border:none; cursor:pointer;">❌</button>
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
        } catch (e) { console.error("Error cargando clases", e); }
    }

    renderizarLista() {
        const container = document.getElementById('clasesListContainer');
        container.innerHTML = this.clases.sort((a,b) => new Date(b.fechaClase) - new Date(a.fechaClase)).map(c => {
            const estado = c.estado || 'Activa';
            const esCancelada = estado === 'Cancelada';
            return `
                <div style="background: var(--bg-container); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; border-left: 5px solid ${esCancelada ? '#ea4335' : '#4285f4'}; opacity: ${esCancelada ? '0.7' : '1'}">
                    <div>
                        <strong style="color: var(--text-primary)">${c.nombre}</strong>
                        <div style="font-size: 0.8em; color: var(--text-muted);">
                            ${new Date(c.fechaClase).toLocaleDateString()} | 
                            <span style="color: ${esCancelada ? '#ea4335' : '#34a853'}">${estado}</span>
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
        const c = this.clases.find(x => x._id === id);
        if (!c) return;
        this.limpiarFormulario();
        document.getElementById('claseIdEdit').value = c._id;
        document.getElementById('claseNombre').value = c.nombre;
        document.getElementById('claseEstado').value = c.estado || 'Activa';
        
        const fecha = new Date(c.fechaClase);
        document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
        document.getElementById('claseHora').value = fecha.toTimeString().split(' ')[0].substring(0,5);
        
        if (c.urls) c.urls.forEach(u => this.agregarCampoUrl(u.tipo, u.link));
        document.getElementById('tituloFormularioClase').innerText = '✏️ Editando Clase';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async guardarClase() {
        const id = document.getElementById('claseIdEdit').value;
        const nombre = document.getElementById('claseNombre').value;
        const fecha = document.getElementById('claseFecha').value;
        
        if (!nombre || !fecha) return this.mostrarMensaje("Nombre y Fecha obligatorios", "error");

        const urls = Array.from(document.querySelectorAll('.url-entry')).map(div => ({
            tipo: div.querySelector('.url-tipo').value,
            link: div.querySelector('.url-link').value.trim()
        })).filter(u => u.link !== "");

        const estado = document.getElementById('claseEstado').value;

        const payload = {
            nombre: nombre,
            fechaClase: `${fecha}T${document.getElementById('claseHora').value}:00`,
            estado: estado,
            urls: urls,
            // SE SOLUCIONA AQUÍ: Siempre activa para que no desaparezca del visor
            activa: true, 
            enlaces: { youtube: "", powerpoint: "" } // Reset para evitar errores de servidor
        };

        try {
            const user = authSystem.getCurrentUser();
            const method = id ? 'PUT' : 'POST';
            const url = `${this.apiBaseUrl}/clases-historicas${id ? '/' + id : ''}`;
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                body: JSON.stringify(payload)
            });
            
            const result = await res.json();
            if (result.success) {
                this.mostrarMensaje("✅ Guardado", "success");
                this.limpiarFormulario();
                this.cargarClases();
            }
        } catch (e) { this.mostrarMensaje("Error de conexión", "error"); }
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseIdEdit').value = '';
        document.getElementById('urlsContainer').innerHTML = '';
        document.getElementById('tituloFormularioClase').innerText = '➕ Gestión de Clase';
    }

    mostrarMensaje(t, tipo) {
        const el = document.getElementById('formMensaje');
        el.innerText = t;
        el.style.display = 'block';
        el.style.color = tipo === 'success' ? '#34a853' : '#ea4335';
        setTimeout(() => el.style.display = 'none', 3000);
    }

    async eliminar(id) {
        if (!confirm("¿Eliminar para siempre?")) return;
        const user = authSystem.getCurrentUser();
        await fetch(`${this.apiBaseUrl}/clases-historicas/${id}`, { method: 'DELETE', headers: { 'user-id': user._id } });
        this.cargarClases();
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(s => s.style.display = 'none');
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        this.cargarClases();
    }
}

window.gestionVisual = new GestionClasesVisual();