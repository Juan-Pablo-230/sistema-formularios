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
        form.onsubmit = (e) => {
            e.preventDefault();
            this.guardarClase();
        };
        document.getElementById('btnLimpiarForm').onclick = () => this.limpiarFormulario();
        document.getElementById('btnAgregarUrl').onclick = () => this.agregarCampoUrl();
        document.getElementById('btnRefrescarClases').onclick = () => this.cargarClases();
        document.getElementById('btnGestionClasesVisual').onclick = () => this.mostrarSeccion();
    }

    agregarCampoUrl(tipo = 'PDF', link = '') {
        const container = document.getElementById('urlsContainer');
        const id = 'url_' + Date.now();
        const div = document.createElement('div');
        div.className = 'url-entry';
        div.id = id;
        div.innerHTML = `
            <select class="url-tipo" style="width:80px;"><option value="PDF" ${tipo==='PDF'?'selected':''}>PDF</option><option value="YouTube" ${tipo==='YouTube'?'selected':''}>YT</option></select>
            <input type="text" class="url-link" value="${link}" placeholder="https://..." style="flex:1;">
            <button type="button" onclick="document.getElementById('${id}').remove()">❌</button>
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
                this.actualizarContadores();
            }
        } catch (e) { console.error(e); }
    }

    actualizarContadores() {
        const total = this.clases.length;
        const domTotal = document.getElementById('statsTotalClases');
        if (domTotal) domTotal.textContent = total;
    }

    renderizarLista() {
        const container = document.getElementById('clasesListContainer');
        container.innerHTML = this.clases.map(c => {
            const estado = c.estado || 'Activa';
            const color = estado === 'Cancelada' ? '#ea4335' : (estado === 'Publicada' ? '#34a853' : '#f9ab00');
            return `
                <div class="clase-card-admin" style="border-left: 5px solid ${color}">
                    <div>
                        <strong>${c.nombre}</strong><br>
                        <small>${new Date(c.fechaClase).toLocaleDateString()} - <span style="color:${color}">${estado}</span></small>
                    </div>
                    <div>
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
        document.getElementById('tituloFormularioClase').textContent = '✏️ Editar Clase';
    }

    async guardarClase() {
        const id = document.getElementById('claseIdEdit').value;
        const nombre = document.getElementById('claseNombre').value.trim();
        const fecha = document.getElementById('claseFecha').value;
        const hora = document.getElementById('claseHora').value;

        if (!nombre || !fecha) return this.mostrarMensaje("Faltan campos", "error");

        const urls = Array.from(document.querySelectorAll('.url-entry')).map(div => ({
            tipo: div.querySelector('.url-tipo').value,
            link: div.querySelector('.url-link').value.trim()
        })).filter(u => u.link !== "");

        const payload = {
            nombre,
            fechaClase: `${fecha}T${hora}:00.000Z`,
            estado: document.getElementById('claseEstado').value,
            urls: urls,
            activa: true,
            instructores: document.getElementById('claseInstructores').value.split(',').map(i => i.trim()).filter(i => i),
            enlaces: { youtube: "", powerpoint: "" } 
        };

        try {
            const user = authSystem.getCurrentUser();
            const res = await fetch(`${this.apiBaseUrl}/clases-historicas${id ? '/'+id : ''}`, {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'user-id': user._id },
                body: JSON.stringify(payload)
            });
            const resData = await res.json();
            if (resData.success) {
                this.mostrarMensaje("✅ Guardado", "success");
                this.limpiarFormulario();
                this.cargarClases();
            } else {
                this.mostrarMensaje("❌ Error: " + resData.message, "error");
            }
        } catch (e) { this.mostrarMensaje("Error servidor", "error"); }
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseIdEdit').value = '';
        document.getElementById('urlsContainer').innerHTML = '';
        document.getElementById('tituloFormularioClase').textContent = '➕ Gestión de Clase';
    }

    mostrarMensaje(t, tipo) {
        const el = document.getElementById('formMensaje');
        el.textContent = t;
        el.style.display = 'block';
        el.style.backgroundColor = tipo === 'success' ? '#d4edda' : '#f8d7da';
        setTimeout(() => el.style.display = 'none', 3000);
    }

    async eliminar(id) {
        if (!confirm("¿Eliminar?")) return;
        const user = authSystem.getCurrentUser();
        await fetch(`${this.apiBaseUrl}/clases-historicas/${id}`, { 
            method: 'DELETE', 
            headers: { 'user-id': user._id } 
        });
        this.cargarClases();
    }

    mostrarSeccion() {
        document.querySelectorAll('.table-container').forEach(s => s.style.display = 'none');
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btnGestionClasesVisual').classList.add('active');
        this.cargarClases();
    }
}
window.gestionVisual = new GestionClasesVisual();