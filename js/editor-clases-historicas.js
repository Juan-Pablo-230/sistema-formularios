console.log('📝 editor-clases-historicas.js cargado - Versión con relleno directo');

class EditorClasesHistoricas {
    constructor() {
        this.clases = [];
        this.claseEditando = null;
        this.apiBaseUrl = window.location.origin + '/api';
        this.nombresMeses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando editor con relleno directo...');
        
        // Verificar permisos
        if (!authSystem.isAdmin()) {
            alert('Solo administradores pueden acceder al editor de clases');
            window.location.href = '/admin/dashboard.html';
            return;
        }

        // Ocultar el editor visual que ya existe y mostrar el nuestro
        const gestionVisualSection = document.getElementById('gestionClasesVisualSection');
        if (gestionVisualSection) {
            gestionVisualSection.style.display = 'block';
        }

        this.configurarEventos();
        await this.cargarClases();
    }

    configurarEventos() {
        // Modificar el botón de refrescar para que también actualice nuestra tabla
        const btnRefrescar = document.getElementById('btnRefrescarClases');
        if (btnRefrescar) {
            btnRefrescar.addEventListener('click', () => this.cargarClases());
        }

        // Modificar el botón de limpiar formulario
        const btnLimpiar = document.getElementById('btnLimpiarForm');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => this.limpiarFormulario());
        }

        // Modificar el formulario existente
        const formExistente = document.getElementById('formClaseHistorica');
        if (formExistente) {
            // Reemplazar el submit original
            const nuevoForm = formExistente.cloneNode(true);
            formExistente.parentNode.replaceChild(nuevoForm, formExistente);
            
            nuevoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.guardarClase();
            });
        }

        // Agregar filtros a la lista de clases
        this.agregarFiltrosALista();
    }

    agregarFiltrosALista() {
        const listPanel = document.querySelector('.list-panel');
        if (!listPanel) return;

        // Agregar filtros arriba de la lista
        const filtrosHTML = `
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                <select id="filtroAnoLista" class="filtro-select" style="flex: 1; min-width: 120px;">
                    <option value="">Todos los años</option>
                </select>
                
                <select id="filtroMesLista" class="filtro-select" style="flex: 1; min-width: 120px;">
                    <option value="">Todos los meses</option>
                </select>
                
                <button id="btnFiltrarLista" class="btn btn-primary btn-small">🔍 Filtrar</button>
                <button id="btnLimpiarFiltrosLista" class="btn btn-secondary btn-small">🗑️ Limpiar</button>
            </div>
        `;

        // Insertar los filtros antes del título
        const titulo = listPanel.querySelector('h3');
        if (titulo) {
            titulo.insertAdjacentHTML('afterend', filtrosHTML);
        }

        // Agregar eventos a los filtros
        document.getElementById('btnFiltrarLista')?.addEventListener('click', () => this.filtrarLista());
        document.getElementById('btnLimpiarFiltrosLista')?.addEventListener('click', () => this.limpiarFiltros());
    }

    async cargarClases() {
        try {
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                headers: {
                    'user-id': user._id
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.clases = result.data || [];
                console.log(`✅ ${this.clases.length} clases cargadas`);
                this.actualizarFiltros();
                this.mostrarClasesEnLista();
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error cargando clases:', error);
            this.mostrarError('Error al cargar las clases');
        }
    }

    actualizarFiltros() {
        // Actualizar filtro de años en la lista
        const selectAno = document.getElementById('filtroAnoLista');
        if (!selectAno) return;
        
        // Obtener años únicos
        const anos = new Set();
        this.clases.forEach(clase => {
            if (clase.fechaClase) {
                const ano = new Date(clase.fechaClase).getFullYear();
                anos.add(ano);
            }
        });
        
        const anosArray = Array.from(anos).sort((a, b) => b - a);
        
        selectAno.innerHTML = '<option value="">Todos los años</option>';
        anosArray.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            selectAno.appendChild(option);
        });
        
        // Actualizar filtro de meses
        const selectMes = document.getElementById('filtroMesLista');
        if (selectMes) {
            selectMes.innerHTML = '<option value="">Todos los meses</option>';
            this.nombresMeses.forEach((mes, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = mes;
                selectMes.appendChild(option);
            });
        }
    }

    filtrarLista() {
        this.mostrarClasesEnLista();
    }

    limpiarFiltros() {
        document.getElementById('filtroAnoLista').value = '';
        document.getElementById('filtroMesLista').value = '';
        this.mostrarClasesEnLista();
    }

    mostrarClasesEnLista() {
        const container = document.getElementById('clasesListContainer');
        if (!container) return;
        
        const filtroAno = document.getElementById('filtroAnoLista')?.value;
        const filtroMes = document.getElementById('filtroMesLista')?.value;
        
        // Aplicar filtros
        let clasesFiltradas = this.clases;
        
        if (filtroAno) {
            clasesFiltradas = clasesFiltradas.filter(c => {
                if (!c.fechaClase) return false;
                return new Date(c.fechaClase).getFullYear() === parseInt(filtroAno);
            });
        }
        
        if (filtroMes) {
            clasesFiltradas = clasesFiltradas.filter(c => {
                if (!c.fechaClase) return false;
                return new Date(c.fechaClase).getMonth() === parseInt(filtroMes);
            });
        }
        
        // Ordenar por fecha (más reciente primero)
        clasesFiltradas.sort((a, b) => {
            return new Date(b.fechaClase) - new Date(a.fechaClase);
        });
        
        if (clasesFiltradas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    📭 No hay clases que coincidan con los filtros
                </div>
            `;
            return;
        }

        let html = '';
        clasesFiltradas.forEach(clase => {
            const fecha = clase.fechaClase ? new Date(clase.fechaClase).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) : 'Sin fecha';
            
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
                    position: relative;
                " onclick="editorClases.cargarClaseEnFormulario('${clase._id}')">
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
                        <button class="btn-small btn-edit" onclick="event.stopPropagation(); editorClases.cargarClaseEnFormulario('${clase._id}')" style="position: absolute; top: 10px; right: 10px;" title="Editar clase">
                            ✏️
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

    cargarClaseEnFormulario(claseId) {
        const clase = this.clases.find(c => c._id === claseId);
        if (!clase) {
            alert('Clase no encontrada');
            return;
        }

        this.claseEditando = clase;

        // Rellenar el formulario de publicación (el de la derecha)
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

        // Cambiar el texto del botón de guardar
        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '✏️ Actualizar Clase';
        }

        // Scroll suave hacia el formulario
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });

        // Resaltar el formulario
        const formPanel = document.querySelector('.form-panel');
        formPanel.style.transition = 'all 0.3s ease';
        formPanel.style.boxShadow = '0 0 0 3px var(--accent-color)';
        setTimeout(() => {
            formPanel.style.boxShadow = 'none';
        }, 2000);

        console.log('✅ Clase cargada en formulario:', clase.nombre);
    }

    limpiarFormulario() {
        document.getElementById('formClaseHistorica').reset();
        document.getElementById('claseFecha').value = '';
        document.getElementById('claseHora').value = '10:00';
        document.getElementById('claseActiva').checked = true;
        this.claseEditando = null;
        
        const submitBtn = document.querySelector('#formClaseHistorica button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '💾 Guardar Clase';
        }
        
        this.mostrarMensaje('Formulario limpiado', 'info');
    }

    async guardarClase() {
        try {
            const claseId = this.claseEditando?._id;
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
                this.mostrarMensaje('El nombre de la clase es obligatorio', 'error');
                return;
            }
            if (!fecha) {
                this.mostrarMensaje('La fecha de la clase es obligatoria', 'error');
                return;
            }
            if (!youtube) {
                this.mostrarMensaje('El enlace de YouTube es obligatorio', 'error');
                return;
            }
            if (!powerpoint) {
                this.mostrarMensaje('El enlace de PowerPoint es obligatorio', 'error');
                return;
            }

            // Procesar instructores
            const instructores = instructoresStr
                ? instructoresStr.split(',').map(i => i.trim()).filter(i => i)
                : [];

            // Crear fecha completa
            const fechaCompleta = new Date(`${fecha}T${hora}:00`).toISOString();

            const claseData = {
                nombre,
                descripcion,
                fechaClase: fechaCompleta,
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

            if (claseId) {
                // Actualizar clase existente
                response = await fetch(`${this.apiBaseUrl}/clases-historicas/${claseId}`, {
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
                this.mostrarMensaje(mensaje, 'success');
                this.limpiarFormulario();
                await this.cargarClases(); // Recargar lista
                
                // Si estábamos editando, resetear
                this.claseEditando = null;
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('❌ Error guardando clase:', error);
            this.mostrarMensaje('Error: ' + error.message, 'error');
        }
    }

    generarTags(nombre) {
        // Generar tags automáticos desde el nombre
        const palabras = nombre.toLowerCase().split(' ');
        return palabras.filter(p => p.length > 3);
    }

    mostrarMensaje(mensaje, tipo) {
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
        }, 3000);
    }

    mostrarError(mensaje) {
        const container = document.getElementById('clasesListContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ea4335;">
                    ❌ ${mensaje}
                </div>
            `;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que authSystem esté listo
    const checkAuth = setInterval(() => {
        if (typeof authSystem !== 'undefined' && authSystem.isLoggedIn()) {
            clearInterval(checkAuth);
            window.editorClases = new EditorClasesHistoricas();
        }
    }, 100);
});