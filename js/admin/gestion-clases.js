// gestion-clases.js
console.log('🎯 Módulo de Gestión de Clases cargado');

class GestionClasesManager {
    constructor() {
        this.data = [];
        this.editandoId = null;
        this.init();
    }

    async init() {
        await this.cargarDatos();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('claseForm')?.addEventListener('submit', (e) => this.guardarClase(e));
        
        document.getElementById('limpiarFormBtn')?.addEventListener('click', () => {
            this.cancelarEdicion();
        });
        
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.cancelarEdicion();
        });
        
        document.getElementById('refrescarClasesBtn')?.addEventListener('click', () => {
            this.cargarDatos();
        });
        
        document.getElementById('buscarClase')?.addEventListener('input', (e) => {
            this.mostrarLista(e.target.value, document.getElementById('filtroEstado').value);
        });
        
        document.getElementById('filtroEstado')?.addEventListener('change', (e) => {
            this.mostrarLista(document.getElementById('buscarClase').value, e.target.value);
        });
    }

    async cargarDatos() {
        try {
            const result = await authSystem.makeRequest('/clases-historicas', null, 'GET');
            this.data = result.data || [];
            console.log(`✅ ${this.data.length} clases cargadas`);
            this.mostrarLista();
            this.actualizarEstadisticas();
        } catch (error) {
            console.error('❌ Error cargando clases:', error);
            this.mostrarError();
        }
    }

mostrarLista(filtroTexto = '', filtroEstado = 'todos') {
    const container = document.getElementById('clasesList');
    if (!container) return;

    let clasesFiltradas = this.data;
    
    // Filtrar por texto
    if (filtroTexto) {
        const termino = filtroTexto.toLowerCase();
        clasesFiltradas = clasesFiltradas.filter(c => 
            c.nombre?.toLowerCase().includes(termino) ||
            c.descripcion?.toLowerCase().includes(termino) ||
            (c.instructores && c.instructores.some(i => i.toLowerCase().includes(termino)))
        );
    }
    
    // Filtrar por estado
    if (filtroEstado === 'publicadas') {
        clasesFiltradas = clasesFiltradas.filter(c => c.estado === 'publicada');
    } else if (filtroEstado === 'activas') {
        clasesFiltradas = clasesFiltradas.filter(c => c.estado === 'activa');
    } else if (filtroEstado === 'canceladas') {
        clasesFiltradas = clasesFiltradas.filter(c => c.estado === 'cancelada');
    }

    if (clasesFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                No hay clases para mostrar
            </div>
        `;
        return;
    }

    clasesFiltradas.sort((a, b) => new Date(b.fechaClase) - new Date(a.fechaClase));

    container.innerHTML = clasesFiltradas.map(clase => {
        // Determinar el estado
        const estado = clase.estado || (clase.activa ? 'activa' : 'inactiva');
        
        // Verificar si tiene enlaces
        const tieneYoutube = clase.enlaces?.youtube ? true : false;
        const tienePowerpoint = clase.enlaces?.powerpoint ? true : false;
        
        // Formatear fecha con hour12: false para forzar 24h
        let fechaFormateada = 'N/A';
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            fechaFormateada = fecha.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false // 🔥 FORZAR FORMATO 24h
            });
        }
        
        // Icono y texto según estado
        let estadoIcono = '';
        let estadoTexto = '';
        let estadoClass = '';
        
        if (estado === 'publicada') {
            estadoIcono = '📢';
            estadoTexto = 'Publicada';
            estadoClass = 'publicada';
        } else if (estado === 'activa') {
            estadoIcono = '✅';
            estadoTexto = 'Activa';
            estadoClass = 'activa';
        } else if (estado === 'cancelada') {
            estadoIcono = '❌';
            estadoTexto = 'Cancelada';
            estadoClass = 'cancelada';
        } else {
            estadoIcono = clase.activa ? '✅' : '❌';
            estadoTexto = clase.activa ? 'Activa' : 'Inactiva';
            estadoClass = clase.activa ? 'activa' : 'inactiva';
        }
        
        return `
        <div class="clase-card ${estadoClass}">
            <div class="clase-header">
                <span class="clase-titulo">${clase.nombre}</span>
                <span class="clase-estado ${estadoClass}">
                    ${estadoIcono} ${estadoTexto}
                </span>
            </div>
            
            ${clase.descripcion ? `<p class="clase-descripcion">${clase.descripcion}</p>` : ''}
            
            <div class="clase-detalles">
                <span>📅 ${fechaFormateada}</span>
                ${clase.instructores?.length ? `<span>👥 ${clase.instructores.join(', ')}</span>` : ''}
            </div>
            
            <div class="clase-enlaces">
                ${tieneYoutube ? `
                    <a href="${clase.enlaces.youtube}" target="_blank" class="material-link youtube" title="Ver en YouTube">
                        ▶️ YouTube
                    </a>
                ` : ''}
                ${tienePowerpoint ? `
                    <a href="${clase.enlaces.powerpoint}" target="_blank" class="material-link powerpoint" title="Ver presentación">
                        📊 Presentación
                    </a>
                ` : ''}
                ${!tieneYoutube && !tienePowerpoint ? 
                    '<span class="sin-enlaces">Sin material disponible</span>' : ''}
            </div>
            
            ${clase.tags?.length ? `
                <div class="clase-tags">
                    ${clase.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="clase-acciones">
                <button class="btn-small btn-edit" onclick="gestionClasesManager.editarClase('${clase._id}')">✏️ Editar</button>
                <button class="btn-small btn-danger" onclick="gestionClasesManager.eliminarClase('${clase._id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `}).join('');
}

    // En la función guardarClase(), asegurar que la fecha se envía en formato correcto
async guardarClase(event) {
    event.preventDefault();
    
    // Validar campos requeridos
    const nombre = document.getElementById('claseNombre')?.value.trim();
    const fecha = document.getElementById('claseFecha')?.value;
    const youtube = document.getElementById('claseYoutube')?.value.trim();
    const powerpoint = document.getElementById('clasePowerpoint')?.value.trim();
    
    // Validaciones
    if (!nombre) {
        this.mostrarMensaje('❌ El nombre de la clase es obligatorio', 'error');
        return;
    }
    
    if (!fecha) {
        this.mostrarMensaje('❌ La fecha de la clase es obligatoria', 'error');
        return;
    }
    
    const hora = document.getElementById('claseHora')?.value || '10:00';
    // Asegurar formato YYYY-MM-DDTHH:mm:ss
    const fechaCompleta = `${fecha}T${hora}:00`;
    
    console.log('📤 Enviando fecha al servidor:', fechaCompleta);
    
    // Procesar instructores
    const instructores = document.getElementById('claseInstructores')?.value
        ? document.getElementById('claseInstructores').value.split(',').map(i => i.trim()).filter(i => i)
        : [];
    
    // Procesar tags
    const tags = document.getElementById('claseTags')?.value
        ? document.getElementById('claseTags').value.split(',').map(t => t.trim()).filter(t => t)
        : [];
    
    // Obtener el estado del selector
    const estadoSelect = document.getElementById('claseEstado');
    const estado = estadoSelect ? estadoSelect.value : 'activa';
    
    // Preparar datos en el formato que espera el servidor
    const claseData = {
        nombre: nombre,
        descripcion: document.getElementById('claseDescripcion')?.value || '',
        fechaClase: fechaCompleta,
        enlaces: {
            youtube: youtube || '',
            powerpoint: powerpoint || ''
        },
        estado: estado,
        instructores: instructores,
        tags: tags
    };
    
    console.log('📤 Enviando datos al servidor:', JSON.stringify(claseData, null, 2));
    
    try {
        let response;
        if (this.editandoId) {
            response = await authSystem.makeRequest(`/clases-historicas/${this.editandoId}`, claseData, 'PUT');
            this.mostrarMensaje('✅ Clase actualizada correctamente', 'success');
        } else {
            response = await authSystem.makeRequest('/clases-historicas', claseData);
            this.mostrarMensaje('✅ Clase creada correctamente', 'success');
        }
        
        console.log('✅ Respuesta del servidor:', response);
        
        this.cancelarEdicion();
        await this.cargarDatos();
    } catch (error) {
        console.error('❌ Error detallado:', error);
        this.mostrarMensaje('❌ Error: ' + error.message, 'error');
    }
}

    editarClase(id) {
        const clase = this.data.find(c => c._id === id);
        if (!clase) return;

        this.editandoId = id;
        
        // Cargar datos básicos
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }
        
        // Cargar enlaces
        document.getElementById('claseYoutube').value = clase.enlaces?.youtube || '';
        document.getElementById('clasePowerpoint').value = clase.enlaces?.powerpoint || '';
        
        // Cargar instructores
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        
        // Cargar tags
        document.getElementById('claseTags').value = clase.tags?.join(', ') || '';
        
        // Cargar el estado - CON VERIFICACIÓN DE EXISTENCIA
        const estadoSelect = document.getElementById('claseEstado');
        if (estadoSelect) {
            if (clase.estado) {
                // Si tiene el nuevo campo estado, usarlo
                estadoSelect.value = clase.estado;
            } else {
                // Si no, derivar del campo activa (compatibilidad)
                estadoSelect.value = clase.activa ? 'activa' : 'inactiva';
            }
            console.log('✅ Estado cargado:', estadoSelect.value);
        } else {
            console.warn('⚠️ Selector de estado no encontrado en el DOM');
        }
        
        document.getElementById('formTitle').innerHTML = '✏️ Editando: ' + clase.nombre;
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        document.getElementById('submitClaseBtn').textContent = '✏️ Actualizar Clase';
        
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    cancelarEdicion() {
        this.editandoId = null;
        this.limpiarFormulario();
        document.getElementById('formTitle').innerHTML = '➕ Agregar Nueva Clase';
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('submitClaseBtn').textContent = '💾 Guardar Clase';
    }

    limpiarFormulario() {
        document.getElementById('claseForm').reset();
        document.getElementById('claseHora').value = '10:00';
        
        const estadoSelect = document.getElementById('claseEstado');
        if (estadoSelect) {
            estadoSelect.value = 'publicada';
        }
        
        this.ocultarMensaje();
    }

    async eliminarClase(id) {
        if (!confirm('¿Está seguro de eliminar esta clase?')) return;

        try {
            await authSystem.makeRequest(`/clases-historicas/${id}`, null, 'DELETE');
            this.mostrarMensaje('✅ Clase eliminada correctamente', 'success');
            await this.cargarDatos();
        } catch (error) {
            this.mostrarMensaje('❌ Error al eliminar: ' + error.message, 'error');
        }
    }

    actualizarEstadisticas() {
        const total = this.data.length;
        const publicadas = this.data.filter(c => c.estado === 'publicada').length;
        const activas = this.data.filter(c => c.estado === 'activa').length;
        const canceladas = this.data.filter(c => c.estado === 'cancelada').length;

        document.getElementById('totalClases').textContent = total;
        document.getElementById('clasesPublicadas').textContent = publicadas;
        document.getElementById('clasesActivas').textContent = activas;
        document.getElementById('clasesCanceladas').textContent = canceladas;
    }

    mostrarMensaje(texto, tipo) {
        const msg = document.getElementById('formMessage');
        msg.textContent = texto;
        msg.className = `message ${tipo}`;
        msg.style.display = 'block';
        
        setTimeout(() => {
            msg.style.display = 'none';
        }, 3000);
    }

    ocultarMensaje() {
        document.getElementById('formMessage').style.display = 'none';
    }

    mostrarError() {
        const container = document.getElementById('clasesList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    ⚠️ Error al cargar las clases
                </div>
            `;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.gestionClasesManager = new GestionClasesManager();
});