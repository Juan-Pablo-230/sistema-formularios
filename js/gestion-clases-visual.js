console.log('🎯 gestion-clases-visual.js cargado - Versión corregida');

class GestionClasesVisual {
    constructor() {
        this.clases = [];
        this.claseEditando = null;
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando gestión visual de clases...');
        
        // Esperar a que authSystem esté disponible
        await this.esperarAuthSystem();
        
        if (!window.authSystem || !window.authSystem.isAdmin()) {
            console.log('❌ No es administrador');
            return;
        }

        this.configurarEventos();
        await this.cargarClases();
    }

    async esperarAuthSystem() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.authSystem && window.authSystem.getCurrentUser) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(resolve, 3000);
        });
    }

    configurarEventos() {
        const form = document.getElementById('formClaseHistorica');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarClase();
            });
        }

        const limpiarBtn = document.getElementById('btnLimpiarForm');
        if (limpiarBtn) {
            limpiarBtn.addEventListener('click', () => {
                this.limpiarFormulario();
            });
        }

        const refrescarBtn = document.getElementById('btnRefrescarClases');
        if (refrescarBtn) {
            refrescarBtn.addEventListener('click', () => {
                this.cargarClases();
            });
        }

        const navBtn = document.getElementById('btnGestionClasesVisual');
        if (navBtn) {
            navBtn.addEventListener('click', () => {
                this.mostrarSeccion();
            });
        }
    }

    async cargarClases() {
        try {
            this.mostrarMensajeLista('Cargando clases...', 'info');
            
            const user = window.authSystem.getCurrentUser();
            
            if (!user || !user._id) {
                throw new Error('Usuario no autenticado');
            }
            
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': user._id
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
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
            this.mostrarMensajeLista('Error al cargar clases. Usando datos de ejemplo.', 'info');
            this.cargarClasesEjemplo();
        }
    }

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
                fechaClase: new Date(Date.now() - 86400000).toISOString(),
                enlaces: {
                    youtube: "https://youtube.com/ejemplo2"
                },
                bibliografia: [],
                activa: true,
                instructores: ["Lic. Prueba"]
            }
        ];
        this.actualizarListaClases();
        this.actualizarEstadisticas();
    }

    actualizarListaClases() {
        const container = document.getElementById('clasesListContainer');
        if (!container) return;
        
        if (this.clases.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    📭 No hay clases históricas cargadas
                </div>
            `;
            return;
        }

        this.clases.sort((a, b) => new Date(b.fechaClase) - new Date(a.fechaClase));

        let html = '';
        this.clases.forEach(clase => {
            const fecha = clase.fechaClase ? new Date(clase.fechaClase).toLocaleDateString('es-AR') : 'Sin fecha';
            const activa = clase.activa !== false;
            
            html += `
                <div class="clase-card" data-id="${clase._id}" style="
                    background: #fff;
                    border: 2px solid ${activa ? '#34a853' : '#ea4335'};
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1; cursor: pointer;" onclick="window.gestionVisual.cargarClaseParaEdicion('${clase._id}')">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="font-weight: bold;">${clase.nombre}</span>
                                <span style="font-size: 0.8em; padding: 2px 8px; border-radius: 12px; background: ${activa ? '#34a853' : '#ea4335'}; color: white;">
                                    ${activa ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                            <div style="font-size: 0.85em; color: #666;">📅 ${fecha}</div>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="event.stopPropagation(); window.gestionVisual.cargarClaseParaEdicion('${clase._id}')" 
                                    style="background: #4285f4; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
                                ✏️
                            </button>
                            <button onclick="event.stopPropagation(); window.gestionVisual.eliminarClase('${clase._id}')" 
                                    style="background: #ea4335; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    cargarClaseParaEdicion(claseId) {
        const clase = this.clases.find(c => c._id === claseId);
        if (!clase) return;

        this.claseEditando = clase;

        document.getElementById('claseNombre').value = clase.nombre || '';
        document.getElementById('claseDescripcion').value = clase.descripcion || '';

        if (clase.fechaClase) {
            const fecha = new Date(clase.fechaClase);
            document.getElementById('claseFecha').value = fecha.toISOString().split('T')[0];
            document.getElementById('claseHora').value = fecha.toTimeString().slice(0, 5);
        }

        document.getElementById('claseYoutube').value = clase.enlaces?.youtube || '';
        document.getElementById('clasePowerpoint').value = clase.enlaces?.powerpoint || '';

        const biblioArray = clase.bibliografia || [];
        document.getElementById('claseBiblio1').value = biblioArray[0] || '';
        document.getElementById('claseBiblio2').value = biblioArray[1] || '';
        document.getElementById('claseBiblio3').value = biblioArray[2] || '';

        document.getElementById('claseInstructores').value = clase.instructores?.join(', ') || '';
        document.getElementById('claseActiva').checked = clase.activa !== false;

        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '✏️ Actualizar Clase';
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseFecha').value = '';
        document.getElementById('claseActiva').checked = true;
        document.getElementById('claseBiblio1').value = '';
        document.getElementById('claseBiblio2').value = '';
        document.getElementById('claseBiblio3').value = '';
        this.claseEditando = null;

        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '💾 Guardar Clase';
    }

    async guardarClase() {
        try {
            const nombre = document.getElementById('claseNombre').value;
            const descripcion = document.getElementById('claseDescripcion').value;
            const fecha = document.getElementById('claseFecha').value;
            const hora = document.getElementById('claseHora').value || '10:00';
            const youtube = document.getElementById('claseYoutube').value;
            const powerpoint = document.getElementById('clasePowerpoint').value;
            const biblio1 = document.getElementById('claseBiblio1').value;
            const biblio2 = document.getElementById('claseBiblio2').value;
            const biblio3 = document.getElementById('claseBiblio3').value;
            const instructoresStr = document.getElementById('claseInstructores').value;
            const activa = document.getElementById('claseActiva').checked;

            if (!nombre) {
                this.mostrarMensajeForm('El nombre de la clase es obligatorio', 'error');
                return;
            }
            if (!fecha) {
                this.mostrarMensajeForm('La fecha de la clase es obligatoria', 'error');
                return;
            }

            const fechaClase = new Date(`${fecha}T${hora}:00`);

            const instructores = instructoresStr
                ? instructoresStr.split(',').map(i => i.trim()).filter(i => i)
                : [];

            const bibliografia = [];
            if (biblio1 && biblio1.trim() !== '') bibliografia.push(biblio1.trim());
            if (biblio2 && biblio2.trim() !== '') bibliografia.push(biblio2.trim());
            if (biblio3 && biblio3.trim() !== '') bibliografia.push(biblio3.trim());

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
                instructores: instructores
            };

            console.log('📤 Enviando:', claseData);

            const user = window.authSystem.getCurrentUser();
            
            if (!user || !user._id) {
                this.mostrarMensajeForm('Error: Usuario no autenticado', 'error');
                return;
            }

            let response;
            let url = `${this.apiBaseUrl}/clases-historicas`;
            let method = 'POST';

            if (this.claseEditando) {
                url = `${this.apiBaseUrl}/clases-historicas/${this.claseEditando._id}`;
                method = 'PUT';
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': user._id
                },
                body: JSON.stringify(claseData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.mostrarMensajeForm(
                    this.claseEditando ? '✅ Clase actualizada' : '✅ Clase creada', 
                    'success'
                );
                this.limpiarFormulario();
                await this.cargarClases();
                this.claseEditando = null;
            } else {
                throw new Error(result.message || 'Error desconocido');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarMensajeForm('Error: ' + error.message, 'error');
        }
    }

    async eliminarClase(claseId) {
        if (!confirm('¿Estás seguro de eliminar esta clase?')) return;

        try {
            const user = window.authSystem.getCurrentUser();
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
            console.error('❌ Error:', error);
            this.mostrarMensajeForm('Error al eliminar', 'error');
        }
    }

    actualizarEstadisticas() {
        document.getElementById('statsTotalClases').textContent = this.clases.length;
        const activas = this.clases.filter(c => c.activa !== false).length;
        document.getElementById('statsClasesActivas').textContent = activas;
    }

    mostrarMensajeForm(mensaje, tipo) {
        const msgDiv = document.getElementById('formMensaje');
        if (!msgDiv) return;
        
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
        if (!container) return;
        
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
        document.querySelectorAll('.table-container').forEach(section => {
            section.style.display = 'none';
        });
        
        const section = document.getElementById('gestionClasesVisualSection');
        if (section) section.style.display = 'block';
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const btn = document.getElementById('btnGestionClasesVisual');
        if (btn) btn.classList.add('active');
        
        this.cargarClases();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Inicializando GestionClasesVisual...');
    window.gestionVisual = new GestionClasesVisual();
});