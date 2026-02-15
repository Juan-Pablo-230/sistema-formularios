console.log('🎯 gestion-clases-visual.js cargado - Versión con campos dinámicos y bibliografía');

class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.claseEditando = null;
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
        // Formulario de creación
        document.getElementById('formClaseHistorica').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarClase();
        });

        // Botón limpiar formulario
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
    }

// ===== DENTRO DE gestion-clases-visual.js =====
// Reemplaza la función cargarClases() completa

async cargarClases() {
    try {
        this.mostrarMensajeLista('Cargando clases...', 'info');
        
        const user = authSystem.getCurrentUser();
        
        if (!user || !user._id) {
            this.mostrarMensajeLista('Error: Usuario no autenticado', 'error');
            return;
        }
        
        console.log('🔍 Cargando clases para usuario:', user._id);
        
        const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'user-id': user._id
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            this.clases = result.data || [];
            this.actualizarListaClases();
            this.actualizarEstadisticas();
            console.log(`✅ ${this.clases.length} clases cargadas`);
        } else {
            throw new Error(result.message || 'Error al cargar clases');
        }
        
    } catch (error) {
        console.error('❌ Error cargando clases:', error);
        this.mostrarMensajeLista('Error al cargar clases: ' + error.message, 'error');
        // En lugar de mostrar error, cargar datos de ejemplo para desarrollo
        console.log('📋 Cargando datos de ejemplo para pruebas');
        this.cargarClasesEjemplo();
    }
}

// AÑADE ESTA FUNCIÓN PARA DATOS DE EJEMPLO (si no existe)
cargarClasesEjemplo() {
    this.clases = [
        {
            _id: "ejemplo_1",
            nombre: "Clase de ejemplo 1",
            descripcion: "Esta es una clase de ejemplo para pruebas",
            fechaClase: new Date().toISOString(),
            enlaces: {
                youtube: "https://youtube.com/ejemplo1",
                powerpoint: "https://docs.google.com/ejemplo1"
            },
            bibliografia: ["https://ejemplo.com/biblio1"],
            activa: true,
            instructores: ["Dr. Ejemplo"]
        },
        {
            _id: "ejemplo_2",
            nombre: "Clase de ejemplo 2",
            descripcion: "Otra clase de ejemplo",
            fechaClase: new Date(Date.now() - 86400000).toISOString(), // ayer
            enlaces: {
                youtube: "https://youtube.com/ejemplo2"
            },
            activa: true,
            instructores: ["Lic. Prueba"]
        }
    ];
    this.actualizarListaClases();
    this.actualizarEstadisticas();
    console.log('✅ Clases de ejemplo cargadas');
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
        const activa = clase.activa !== false;
        
        // Generar HTML para los enlaces de bibliografía
        let bibliografiaHTML = '';
        if (clase.bibliografia && clase.bibliografia.length > 0) {
            bibliografiaHTML = '<div style="margin-top: 5px; font-size: 0.8em;">📚 Biblio: ';
            bibliografiaHTML += clase.bibliografia.map((url, index) => {
                // Acortar URL para mostrar
                let displayUrl = url;
                if (url.length > 30) {
                    displayUrl = url.substring(0, 27) + '...';
                }
                return `<a href="${url}" target="_blank" title="${url}" style="color: var(--accent-color);">[${index + 1}]</a>`;
            }).join(' ');
            bibliografiaHTML += '</div>';
        }
        
        html += `
            <div class="clase-card" data-id="${clase._id}" style="
                background: var(--bg-container);
                border: 2px solid ${activa ? 'var(--success-500)' : 'var(--error-500)'};
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                transition: all 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;" onclick="gestionVisual.cargarClaseParaEdicion('${clase._id}')" style="cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <span style="font-weight: bold; color: var(--text-primary);">${clase.nombre}</span>
                            <span style="font-size: 0.8em; padding: 2px 8px; border-radius: 12px; background: ${activa ? '#34a853' : '#ea4335'}; color: white;">
                                ${activa ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-muted); margin-bottom: 5px;">
                            📅 ${fecha}
                        </div>
                        <div style="font-size: 0.85em; color: var(--text-secondary);">
                            ${clase.enlaces?.youtube ? '<span title="YouTube">📹 Video</span>' : ''}
                            ${clase.enlaces?.powerpoint ? ' <span title="PowerPoint">📊 PPT</span>' : ''}
                        </div>
                        ${bibliografiaHTML}
                        ${clase.instructores && clase.instructores.length > 0 ? `
                            <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 5px;">
                                👥 ${clase.instructores.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 5px; margin-left: 10px;">
                        <!-- BOTÓN DE EDITAR AÑADIDO -->
                        <button class="btn-small btn-edit" onclick="event.stopPropagation(); gestionVisual.cargarClaseParaEdicion('${clase._id}')" title="Editar clase" style="background: var(--accent-color); color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
                            ✏️
                        </button>
                        <!-- BOTÓN DE ELIMINAR -->
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); gestionVisual.eliminarClase('${clase._id}')" title="Eliminar clase" style="background: var(--error-500); color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
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
        if (url.length > 30) {
            return url.substring(0, 27) + '...';
        }
        return url;
    }

    cargarClaseParaEdicion(claseId) {
        const clase = this.clases.find(c => c._id === claseId);
        if (!clase) return;

        this.claseEditando = clase;

        // Llenar formulario con datos existentes
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';

        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }

        // Enlaces principales
        document.getElementById('claseYoutube').value = clase.enlaces?.youtube || '';
        document.getElementById('clasePowerpoint').value = clase.enlaces?.powerpoint || '';

        // NUEVO: Rellenar campos de bibliografía desde el array
        const biblioArray = clase.bibliografia || [];
        document.getElementById('claseBiblio1').value = biblioArray[0] || '';
        document.getElementById('claseBiblio2').value = biblioArray[1] || '';
        document.getElementById('claseBiblio3').value = biblioArray[2] || '';

        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseActiva').checked = clase.activa !== false;

        // Cambiar texto del botón para indicar que estamos editando
        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        submitBtn.innerHTML = '✏️ Actualizar Clase';

        // Scroll al formulario
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseFecha').value = '';
        document.getElementById('claseActiva').checked = true;
        // Asegurarse de limpiar los nuevos campos
        document.getElementById('claseBiblio1').value = '';
        document.getElementById('claseBiblio2').value = '';
        document.getElementById('claseBiblio3').value = '';
        this.claseEditando = null;

        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        submitBtn.innerHTML = '💾 Guardar Clase';

        this.mostrarMensajeForm('Formulario limpiado', 'info');
    }

// ===== DENTRO DE gestion-clases-visual.js =====
// Reemplaza la función guardarClase() completa

async guardarClase() {
    try {
        // Recoger datos del formulario
        const nombre = document.getElementById('claseNombre').value;
        const descripcion = document.getElementById('claseDescripcion').value;
        const fecha = document.getElementById('claseFecha').value;
        const hora = document.getElementById('claseHora').value || '10:00';
        const youtube = document.getElementById('claseYoutube').value;
        const powerpoint = document.getElementById('clasePowerpoint').value;
        // Recoger nuevos campos de bibliografía
        const biblio1 = document.getElementById('claseBiblio1').value;
        const biblio2 = document.getElementById('claseBiblio2').value;
        const biblio3 = document.getElementById('claseBiblio3').value;
        const instructoresStr = document.getElementById('claseInstructores').value;
        const activa = document.getElementById('claseActiva').checked;

        // Validaciones (solo nombre y fecha son obligatorios)
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

        // Crear el array de bibliografía, filtrando los vacíos
        const bibliografia = [];
        if (biblio1 && biblio1.trim() !== '') bibliografia.push(biblio1.trim());
        if (biblio2 && biblio2.trim() !== '') bibliografia.push(biblio2.trim());
        if (biblio3 && biblio3.trim() !== '') bibliografia.push(biblio3.trim());

        // Estructura de datos CORREGIDA para que coincida con lo que espera el servidor
        const claseData = {
            nombre: nombre,
            descripcion: descripcion || '',
            fechaClase: fechaClase.toISOString(),
            enlaces: {
                youtube: youtube || '',
                powerpoint: powerpoint || ''
            },
            bibliografia: bibliografia,
            activa: activa,
            instructores: instructores,
            tags: this.generarTags(nombre)
        };

        console.log('📤 Enviando datos al servidor:', claseData);

        const user = authSystem.getCurrentUser();
        let response;
        let mensaje;

        // IMPORTANTE: Verificar que el usuario tenga _id
        if (!user || !user._id) {
            this.mostrarMensajeForm('Error: Usuario no autenticado correctamente', 'error');
            return;
        }

        const headers = {
            'Content-Type': 'application/json',
            'user-id': user._id
        };

        if (this.claseEditando) {
            // Actualizar clase existente
            console.log('✏️ Editando clase:', this.claseEditando._id);
            response = await fetch(`${this.apiBaseUrl}/clases-historicas/${this.claseEditando._id}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(claseData)
            });
            mensaje = '✅ Clase actualizada correctamente';
        } else {
            // Crear nueva clase
            console.log('➕ Creando nueva clase');
            response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(claseData)
            });
            mensaje = '✅ Clase creada correctamente';
        }

        // Verificar si la respuesta es OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', response.status, errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (result.success) {
            this.mostrarMensajeForm(mensaje, 'success');
            this.limpiarFormulario();
            await this.cargarClases(); // Recargar lista
            this.claseEditando = null;
        } else {
            throw new Error(result.message || 'Error desconocido');
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
                
                if (this.claseEditando?._id === claseId) {
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
        // Generar tags automáticos desde el nombre
        const palabras = nombre.toLowerCase().split(' ');
        return palabras.filter(p => p.length > 3);
    }

    async actualizarEstadisticas() {
        try {
            // Total clases
            document.getElementById('statsTotalClases').textContent = this.clases.length;
            
            // Clases activas
            const activas = this.clases.filter(c => c.activa !== false).length;
            document.getElementById('statsClasesActivas').textContent = activas;
            
            // Clases próximas (próximos 30 días)
            const hoy = new Date();
            const mesProximo = new Date();
            mesProximo.setDate(mesProximo.getDate() + 30);
            
            const proximas = this.clases.filter(c => {
                if (!c.fechaClase) return false;
                const fechaClase = new Date(c.fechaClase);
                return fechaClase >= hoy && fechaClase <= mesProximo;
            }).length;
            document.getElementById('statsClasesProximas').textContent = proximas;
            
            // Total solicitudes (desde el admin system)
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
        const colores = {
            info: '#4285f4',
            error: '#ea4335'
        };
        
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: ${colores[tipo]};">
                ${mensaje}
            </div>
        `;
    }

    mostrarSeccion() {
        // Ocultar otras secciones
        document.querySelectorAll('.table-container').forEach(section => {
            section.style.display = 'none';
        });
        
        // Mostrar esta sección
        document.getElementById('gestionClasesVisualSection').style.display = 'block';
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('btnGestionClasesVisual').classList.add('active');
        
        // Recargar datos
        this.cargarClases();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que authSystem esté listo
    const checkAuth = setInterval(() => {
        if (typeof authSystem !== 'undefined' && authSystem.isLoggedIn()) {
            clearInterval(checkAuth);
            window.gestionVisual = new GestionClasesVisual();
        }
    }, 100);
});