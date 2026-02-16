console.log('🎯 gestion-clases-visual.js cargado');

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
            const activa = clase.activa !== false;
            
            html += `
                <div class="clase-card" data-id="${clase._id}" style="
                    background: var(--bg-container);
                    border: 2px solid ${activa ? 'var(--success-500)' : 'var(--error-500)'};
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onclick="gestionVisual.cargarClaseParaEdicion('${clase._id}')">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
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
                                <span title="YouTube">📹 ${this.acortarUrl(clase.enlaces?.youtube)}</span><br>
                                <span title="PowerPoint">📊 ${this.acortarUrl(clase.enlaces?.powerpoint)}</span>
                            </div>
                            ${clase.instructores ? `
                                <div style="font-size: 0.8em; color: var(--text-muted); margin-top: 5px;">
                                    👥 ${clase.instructores.join(', ')}
                                </div>
                            ` : ''}
                        </div>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); gestionVisual.eliminarClase('${clase._id}')" style="margin-left: 10px;">
                            🗑️
                        </button>
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

        // Llenar formulario
        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';
        
        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }
        
        document.getElementById('claseYoutube').value = clase.enlaces?.youtube || '';
        document.getElementById('clasePowerpoint').value = clase.enlaces?.powerpoint || '';
        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseActiva').checked = clase.activa !== false;

        // Cambiar texto del botón
        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        submitBtn.innerHTML = '✏️ Actualizar Clase';
        
        // Scroll al formulario
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseFecha').value = '';
        document.getElementById('claseActiva').checked = true;
        this.claseEditando = null;
        
        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        submitBtn.innerHTML = '💾 Guardar Clase';
        
        this.mostrarMensajeForm('Formulario limpiado', 'info');
    }

    async guardarClase() {
        try {
            // Recoger datos del formulario
            const nombre = document.getElementById('claseNombre').value;
            const descripcion = document.getElementById('claseDescripcion').value;
            const fecha = document.getElementById('claseFecha').value;
            const hora = document.getElementById('claseHora').value || '10:00';
            const youtube = document.getElementById('claseYoutube').value;
            const powerpoint = document.getElementById('clasePowerpoint').value;
            const instructoresStr = document.getElementById('claseInstructores').value;
            const activa = document.getElementById('claseActiva').checked;

            // Validaciones
            if (!nombre) {
                this.mostrarMensajeForm('El nombre de la clase es obligatorio', 'error');
                return;
            }
            if (!fecha) {
                this.mostrarMensajeForm('La fecha de la clase es obligatoria', 'error');
                return;
            }
            if (!youtube) {
                this.mostrarMensajeForm('El enlace de YouTube es obligatorio', 'error');
                return;
            }
            if (!powerpoint) {
                this.mostrarMensajeForm('El enlace de PowerPoint es obligatorio', 'error');
                return;
            }

            // Crear objeto fecha
            const fechaClase = new Date(`${fecha}T${hora}:00`);

            // Procesar instructores
            const instructores = instructoresStr
                ? instructoresStr.split(',').map(i => i.trim()).filter(i => i)
                : [];

            const claseData = {
                nombre,
                descripcion,
                fechaClase: fechaClase.toISOString(),
                enlaces: {
                    youtube,
                    powerpoint
                },
                activa,
                instructores,
                tags: this.generarTags(nombre)
            };

            const user = authSystem.getCurrentUser();
            let response;
            let mensaje;

            if (this.claseEditando) {
                // Actualizar clase existente
                response = await fetch(`${this.apiBaseUrl}/clases-historicas/${this.claseEditando._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': user._id
                    },
                    body: JSON.stringify(claseData)
                });
                mensaje = '✅ Clase actualizada correctamente';
            } else {
                // Crear nueva clase
                response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'user-id': user._id
                    },
                    body: JSON.stringify(claseData)
                });
                mensaje = '✅ Clase creada correctamente';
            }

            const result = await response.json();

            if (result.success) {
                this.mostrarMensajeForm(mensaje, 'success');
                this.limpiarFormulario();
                await this.cargarClases(); // Recargar lista
                
                // Si estábamos editando, resetear
                this.claseEditando = null;
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