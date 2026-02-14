console.log('📚 material-historico.js cargado - MongoDB Version');

class MaterialHistorico {
    constructor() {
        this.solicitudes = [];
        this.clasesHistoricas = [];
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando sistema de material histórico...');
        
        await this.esperarAuthSystem();
        
        if (!authSystem || !authSystem.isLoggedIn()) {
            console.log('❌ Usuario no logueado');
            this.mostrarMensaje('Debe iniciar sesión para solicitar material', 'error');
            setTimeout(() => window.location.href = '/index.html', 2000);
            return;
        }

        await this.cargarClasesHistoricas();
        this.configurarUI();
        await this.cargarMisSolicitudes();
    }

    async esperarAuthSystem() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof authSystem !== 'undefined' && authSystem.getCurrentUser) {
                    clearInterval(check);
                    console.log('✅ authSystem disponible');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                console.log('⚠️ Timeout esperando authSystem');
                resolve();
            }, 5000);
        });
    }

    async cargarClasesHistoricas() {
        try {
            console.log('📥 Cargando clases históricas...');
            
            // Intentar cargar desde MongoDB primero
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': authSystem.getCurrentUser()._id
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.clasesHistoricas = result.data;
                    console.log(`✅ ${this.clasesHistoricas.length} clases históricas cargadas desde MongoDB`);
                } else {
                    // Si no hay datos en MongoDB, usar datos de ejemplo
                    this.cargarClasesEjemplo();
                }
            } else {
                // Si hay error, usar datos de ejemplo
                this.cargarClasesEjemplo();
            }
            
            this.llenarSelectClases();
            
        } catch (error) {
            console.error('❌ Error cargando clases históricas:', error);
            this.cargarClasesEjemplo();
            this.llenarSelectClases();
        }
    }

    cargarClasesEjemplo() {
        console.log('📋 Usando clases de ejemplo');
        this.clasesHistoricas = [
            {
                _id: "clase_001",
                nombre: "Telemetría Avanzada",
                descripcion: "Clase grabada sobre monitoreo cardíaco y telemetría",
                fechaClase: "2026-02-10",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=ejemplo1",
                    powerpoint: "https://docs.google.com/presentation/d/ejemplo1"
                }
            },
            {
                _id: "clase_002",
                nombre: "Rotación de Personal en Salud",
                descripcion: "Estrategias y mejores prácticas para rotación de personal",
                fechaClase: "2026-02-11",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=ejemplo2",
                    powerpoint: "https://docs.google.com/presentation/d/ejemplo2"
                }
            },
            {
                _id: "clase_003",
                nombre: "Gestión de Ausentismo",
                descripcion: "Manejo y prevención del ausentismo laboral",
                fechaClase: "2026-02-19",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=ejemplo3",
                    powerpoint: "https://docs.google.com/presentation/d/ejemplo3"
                }
            },
            {
                _id: "clase_004",
                nombre: "Stroke / IAM - Protocolos de Emergencia",
                descripcion: "Actualización en manejo de ACV e Infarto",
                fechaClase: "2026-02-24",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=ejemplo4",
                    powerpoint: "https://docs.google.com/presentation/d/ejemplo4"
                }
            },
            {
                _id: "clase_005",
                nombre: "CoPaP - Cuidados Paliativos",
                descripcion: "Abordaje integral en cuidados paliativos",
                fechaClase: "2026-02-25",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=ejemplo5",
                    powerpoint: "https://docs.google.com/presentation/d/ejemplo5"
                }
            }
        ];
    }

    llenarSelectClases() {
        const select = document.getElementById('claseSeleccionada');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione una clase histórica</option>';
        
        this.clasesHistoricas.sort((a, b) => {
            if (a.fechaClase && b.fechaClase) {
                return new Date(b.fechaClase) - new Date(a.fechaClase);
            }
            return 0;
        });
        
        this.clasesHistoricas.forEach(clase => {
            const option = document.createElement('option');
            option.value = clase._id;
            option.textContent = `${clase.nombre} (${clase.fechaClase || 'Fecha no disponible'})`;
            option.dataset.nombre = clase.nombre;
            option.dataset.descripcion = clase.descripcion || '';
            option.dataset.youtube = clase.enlaces?.youtube || '';
            option.dataset.powerpoint = clase.enlaces?.powerpoint || '';
            select.appendChild(option);
        });
        
        console.log(`✅ Select cargado con ${this.clasesHistoricas.length} opciones`);
    }

    configurarUI() {
        const usuario = authSystem.getCurrentUser();
        console.log('👤 Usuario actual:', usuario);
        
        if (usuario && usuario.email) {
            document.getElementById('emailUsuario').value = usuario.email;
        }

        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
            window.location.href = '/index.html';
        });

        document.getElementById('materialHistoricoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.procesarSolicitud();
        });

        document.getElementById('solicitarOtraClase')?.addEventListener('click', () => {
            this.ocultarMaterial();
        });
    }

    async procesarSolicitud() {
        const claseId = document.getElementById('claseSeleccionada').value;
        
        if (!claseId) {
            this.mostrarMensaje('Por favor, seleccione una clase', 'error');
            return;
        }

        const selectOption = document.querySelector(`#claseSeleccionada option[value="${claseId}"]`);
        
        if (!selectOption) {
            this.mostrarMensaje('Error: Clase no encontrada', 'error');
            return;
        }

        const claseData = {
            id: claseId,
            nombre: selectOption.dataset.nombre,
            descripcion: selectOption.dataset.descripcion,
            youtube: selectOption.dataset.youtube,
            powerpoint: selectOption.dataset.powerpoint
        };

        // Mostrar enlaces del material
        this.mostrarMaterial(claseData);
        
        // Guardar solicitud en MongoDB
        await this.guardarSolicitud(claseData);
    }

    mostrarMaterial(claseData) {
        const materialLinks = document.getElementById('materialLinks');
        const claseNombre = document.getElementById('claseNombre');
        const claseDescripcion = document.getElementById('claseDescripcion');
        const linksContainer = document.getElementById('linksContainer');
        
        claseNombre.textContent = claseData.nombre;
        claseDescripcion.textContent = claseData.descripcion || 'Material de la clase grabada';
        
        linksContainer.innerHTML = '';
        
        if (claseData.youtube) {
            linksContainer.innerHTML += `
                <div class="link-card youtube" onclick="window.open('${claseData.youtube}', '_blank')">
                    <a href="${claseData.youtube}" target="_blank">
                        <div class="icon">▶️</div>
                        <div class="title">YouTube</div>
                        <div class="subtitle">Ver grabación de la clase</div>
                        <div class="hover-info">Click para abrir el video</div>
                    </a>
                </div>
            `;
        }
        
        if (claseData.powerpoint) {
            linksContainer.innerHTML += `
                <div class="link-card powerpoint" onclick="window.open('${claseData.powerpoint}', '_blank')">
                    <a href="${claseData.powerpoint}" target="_blank">
                        <div class="icon">📊</div>
                        <div class="title">PowerPoint</div>
                        <div class="subtitle">Descargar presentación</div>
                        <div class="hover-info">Click para abrir la presentación</div>
                    </a>
                </div>
            `;
        }
        
        // Ocultar formulario, mostrar enlaces
        document.getElementById('materialHistoricoForm').style.display = 'none';
        materialLinks.classList.add('visible');
        
        this.mostrarMensaje('✅ Material disponible', 'success');
    }

    ocultarMaterial() {
        document.getElementById('materialHistoricoForm').style.display = 'block';
        document.getElementById('materialLinks').classList.remove('visible');
        document.getElementById('claseSeleccionada').value = '';
    }

    async guardarSolicitud(claseData) {
        try {
            const user = authSystem.getCurrentUser();
            
            const solicitudData = {
                claseId: claseData.id,
                claseNombre: claseData.nombre,
                email: user.email,
                youtube: claseData.youtube,
                powerpoint: claseData.powerpoint,
                fechaSolicitud: new Date().toISOString()
            };

            console.log('📤 Guardando solicitud:', solicitudData);
            
            const result = await authSystem.makeRequest('/material-historico/solicitudes', solicitudData);
            
            if (result.success) {
                console.log('✅ Solicitud guardada');
                await this.cargarMisSolicitudes();
            }
            
        } catch (error) {
            console.error('❌ Error guardando solicitud:', error);
            // Si no se puede guardar en MongoDB, igual mostramos el material
            this.mostrarMensaje('Material disponible (modo offline)', 'info');
        }
    }

    async cargarMisSolicitudes() {
        try {
            const user = authSystem.getCurrentUser();
            
            console.log('🔍 Cargando historial de solicitudes...');
            
            const response = await fetch(`${this.apiBaseUrl}/material-historico/solicitudes`, {
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': user._id
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.solicitudes = result.data;
                } else {
                    // Si no hay datos en MongoDB, usar localStorage como respaldo
                    this.cargarSolicitudesLocal();
                }
            } else {
                this.cargarSolicitudesLocal();
            }
            
            this.mostrarMisSolicitudes();
            
        } catch (error) {
            console.error('❌ Error cargando solicitudes:', error);
            this.cargarSolicitudesLocal();
            this.mostrarMisSolicitudes();
        }
    }

    cargarSolicitudesLocal() {
        const user = authSystem.getCurrentUser();
        const storageKey = `material_historico_${user._id}`;
        const stored = localStorage.getItem(storageKey);
        this.solicitudes = stored ? JSON.parse(stored) : [];
        console.log(`📋 ${this.solicitudes.length} solicitudes cargadas desde localStorage`);
    }

    mostrarMisSolicitudes() {
        const tbody = document.querySelector('#tablaMisSolicitudes tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (this.solicitudes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: #666; padding: 20px;">
                        No has solicitado material histórico todavía
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por fecha más reciente
        this.solicitudes.sort((a, b) => 
            new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)
        );

        this.solicitudes.forEach(solicitud => {
            const row = document.createElement('tr');
            
            const fecha = solicitud.fechaSolicitud ? 
                new Date(solicitud.fechaSolicitud).toLocaleString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 
                'Fecha no disponible';
            
            const materialHTML = this.generarMaterialHTML(solicitud);
            
            row.innerHTML = `
                <td>${solicitud.claseNombre || solicitud.clase || 'N/A'}</td>
                <td>${fecha}</td>
                <td class="material-badge">${materialHTML}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    generarMaterialHTML(solicitud) {
        const enlaces = [];
        
        if (solicitud.youtube) {
            enlaces.push(`<a href="${solicitud.youtube}" target="_blank" title="Ver en YouTube">▶️ YouTube</a>`);
        }
        
        if (solicitud.powerpoint) {
            enlaces.push(`<a href="${solicitud.powerpoint}" target="_blank" title="Ver presentación">📊 PPT</a>`);
        }
        
        if (enlaces.length === 0) {
            return '<span style="color: #666;">Material disponible</span>';
        }
        
        return enlaces.join(' ');
    }

    mostrarMensaje(mensaje, tipo) {
        const mensajeDiv = document.getElementById('statusMessage');
        mensajeDiv.textContent = mensaje;
        mensajeDiv.className = `status-message ${tipo}`;
        mensajeDiv.style.display = 'block';

        setTimeout(() => {
            mensajeDiv.style.display = 'none';
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, inicializando MaterialHistorico...');
    window.materialHistorico = new MaterialHistorico();
});