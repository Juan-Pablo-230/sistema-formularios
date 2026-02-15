console.log('📚 material-historico.js cargado - Versión con campos dinámicos y formato 24hs');

class MaterialHistorico {
    constructor() {
        this.solicitudes = [];
        this.clasesHistoricas = [];
        this.clasesFiltradas = [];
        this.anosDisponibles = [];
        this.mesesDisponibles = [];
        this.anoSeleccionado = null;
        this.mesSeleccionado = null;
        this.apiBaseUrl = window.location.origin + '/api';
        this.nombresMeses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
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

        this.configurarUI();
        await this.cargarClasesHistoricas();
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
            console.log('📥 Cargando clases históricas desde MongoDB...');
            
            const user = authSystem.getCurrentUser();
            const response = await fetch(`${this.apiBaseUrl}/clases-historicas`, {
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': user._id
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // SOLO mostrar clases activas al usuario final
                this.clasesHistoricas = result.data.filter(clase => clase.activa !== false);
                console.log(`✅ ${this.clasesHistoricas.length} clases activas cargadas`);
                
                this.procesarAnosDisponibles();
                this.llenarSelectorAnos();
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
            
        } catch (error) {
            console.error('❌ Error cargando clases históricas:', error);
            this.mostrarMensaje('Error al cargar clases. Usando datos de ejemplo.', 'info');
            this.cargarClasesEjemplo();
        }
    }

    cargarClasesEjemplo() {
        console.log('📋 Usando clases de ejemplo');
        this.clasesHistoricas = [
            {
                _id: "clase_001",
                nombre: "Telemetría Avanzada",
                descripcion: "Monitoreo cardíaco continuo y telemetría en unidades coronarias",
                fechaClase: "2026-02-10T10:00:00Z",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=telemetria2026",
                    powerpoint: "https://docs.google.com/presentation/d/1-telemetria"
                },
                bibliografia: [
                    "https://www.example.com/biblio1",
                    "https://www.example.com/biblio2"
                ],
                activa: true,
                instructores: ["Dr. Juan Pérez", "Lic. María González"]
            },
            {
                _id: "clase_002",
                nombre: "Rotación de Personal en Salud",
                descripcion: "Estrategias para gestionar la rotación del personal",
                fechaClase: "2026-02-15T17:00:00Z",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=rotacion2026"
                },
                activa: true,
                instructores: ["Lic. Ana López"]
            },
            {
                _id: "clase_003",
                nombre: "Gestión de Ausentismo",
                descripcion: "Herramientas para reducir el ausentismo laboral",
                fechaClase: "2025-11-20T13:00:00Z",
                enlaces: {
                    powerpoint: "https://docs.google.com/presentation/d/1-ausentismo"
                },
                activa: false,
                instructores: ["Lic. Laura Martínez"]
            },
            {
                _id: "clase_004",
                nombre: "Stroke / IAM",
                descripcion: "Protocolos de emergencia para ACV e Infarto",
                fechaClase: "2025-09-24T13:00:00Z",
                enlaces: {
                    youtube: "https://www.youtube.com/watch?v=stroke2025",
                    powerpoint: "https://docs.google.com/presentation/d/1-stroke"
                },
                bibliografia: [
                    "https://www.example.com/stroke-guia"
                ],
                activa: true,
                instructores: ["Dr. Roberto Sánchez"]
            }
        ];
        
        this.procesarAnosDisponibles();
        this.llenarSelectorAnos();
    }

    procesarAnosDisponibles() {
        // Extraer años únicos de las fechas de las clases
        const anos = new Set();
        
        this.clasesHistoricas.forEach(clase => {
            if (clase.fechaClase) {
                const fecha = new Date(clase.fechaClase);
                const ano = fecha.getFullYear();
                if (!isNaN(ano)) {
                    anos.add(ano);
                }
            }
        });
        
        // Convertir a array y ordenar descendente (más reciente primero)
        this.anosDisponibles = Array.from(anos).sort((a, b) => b - a);
        
        console.log(`📅 Años disponibles: ${this.anosDisponibles.join(', ')}`);
    }

    llenarSelectorAnos() {
        const selectAno = document.getElementById('anoSeleccionado');
        if (!selectAno) return;
        
        if (this.anosDisponibles.length === 0) {
            selectAno.innerHTML = '<option value="">No hay años disponibles</option>';
            return;
        }
        
        selectAno.innerHTML = '<option value="">Seleccione un año</option>';
        
        this.anosDisponibles.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            selectAno.appendChild(option);
        });
        
        // Agregar evento de cambio
        selectAno.addEventListener('change', (e) => {
            this.anoSeleccionado = e.target.value;
            this.procesarMesesDisponibles();
        });
        
        console.log('✅ Selector de años cargado');
    }

    procesarMesesDisponibles() {
        if (!this.anoSeleccionado) {
            this.mesesDisponibles = [];
            this.llenarSelectorMeses();
            return;
        }
        
        // Extraer meses únicos para el año seleccionado
        const meses = new Set();
        
        this.clasesHistoricas.forEach(clase => {
            if (clase.fechaClase) {
                const fecha = new Date(clase.fechaClase);
                if (fecha.getFullYear() === parseInt(this.anoSeleccionado)) {
                    const mes = fecha.getMonth(); // 0-11
                    meses.add(mes);
                }
            }
        });
        
        // Convertir a array y ordenar (1-12)
        this.mesesDisponibles = Array.from(meses).sort((a, b) => a - b);
        
        console.log(`📆 Meses disponibles para ${this.anoSeleccionado}: ${this.mesesDisponibles.map(m => this.nombresMeses[m]).join(', ')}`);
        
        this.llenarSelectorMeses();
    }

    llenarSelectorMeses() {
        const selectMes = document.getElementById('mesSeleccionado');
        if (!selectMes) return;
        
        // Limpiar y habilitar/deshabilitar
        selectMes.innerHTML = '';
        selectMes.disabled = false;
        
        if (!this.anoSeleccionado) {
            selectMes.innerHTML = '<option value="">Primero seleccione año</option>';
            selectMes.disabled = true;
            return;
        }
        
        if (this.mesesDisponibles.length === 0) {
            selectMes.innerHTML = '<option value="">No hay meses con clases</option>';
            this.filtrarClasesPorMes();
            return;
        }
        
        selectMes.innerHTML = '<option value="">Seleccione un mes</option>';
        
        this.mesesDisponibles.forEach(mesNum => {
            const option = document.createElement('option');
            option.value = mesNum;
            option.textContent = this.nombresMeses[mesNum];
            selectMes.appendChild(option);
        });
        
        // Agregar evento de cambio
        selectMes.addEventListener('change', (e) => {
            this.mesSeleccionado = e.target.value;
            this.filtrarClasesPorMes();
        });
        
        console.log('✅ Selector de meses cargado');
    }

    filtrarClasesPorMes() {
        const selectClase = document.getElementById('claseSeleccionada');
        const form = document.getElementById('materialHistoricoForm');
        const sinClasesMensaje = document.getElementById('sinClasesMensaje');
        
        if (!this.anoSeleccionado || !this.mesSeleccionado) {
            form.style.display = 'none';
            sinClasesMensaje.style.display = 'none';
            return;
        }
        
        // Filtrar clases por año y mes
        this.clasesFiltradas = this.clasesHistoricas.filter(clase => {
            if (!clase.fechaClase) return false;
            const fecha = new Date(clase.fechaClase);
            return fecha.getFullYear() === parseInt(this.anoSeleccionado) && 
                   fecha.getMonth() === parseInt(this.mesSeleccionado);
        });
        
        console.log(`🔍 ${this.clasesFiltradas.length} clases encontradas para ${this.nombresMeses[this.mesSeleccionado]} ${this.anoSeleccionado}`);
        
        if (this.clasesFiltradas.length === 0) {
            // No hay clases para este período
            form.style.display = 'none';
            sinClasesMensaje.style.display = 'block';
            return;
        }
        
        // Hay clases, mostrar el formulario
        sinClasesMensaje.style.display = 'none';
        form.style.display = 'block';
        this.llenarSelectClases();
    }

    llenarSelectClases() {
        const select = document.getElementById('claseSeleccionada');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione una clase</option>';
        
        // Ordenar por fecha (más reciente primero)
        this.clasesFiltradas.sort((a, b) => {
            return new Date(b.fechaClase) - new Date(a.fechaClase);
        });
        
        this.clasesFiltradas.forEach(clase => {
            const option = document.createElement('option');
            option.value = clase._id;
            
            // Formatear fecha para mostrar (CON FORMATO 24 HORAS)
            let fechaTexto = '';
            if (clase.fechaClase) {
                const fecha = new Date(clase.fechaClase);
                fechaTexto = fecha.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false  // 👈 FORMATO 24 HORAS
                });
            }
            
            option.textContent = `${clase.nombre} (${fechaTexto})`;
            option.dataset.nombre = clase.nombre;
            option.dataset.descripcion = clase.descripcion || '';
            option.dataset.fecha = clase.fechaClase;
            option.dataset.youtube = clase.enlaces?.youtube || '';
            option.dataset.powerpoint = clase.enlaces?.powerpoint || '';
            option.dataset.bibliografia = clase.bibliografia ? JSON.stringify(clase.bibliografia) : '[]';
            option.dataset.instructores = clase.instructores?.join(', ') || '';
            
            select.appendChild(option);
        });
        
        console.log(`✅ Selector de clases cargado con ${this.clasesFiltradas.length} opciones`);
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

        // Parsear bibliografía si existe
        let bibliografia = [];
        try {
            bibliografia = JSON.parse(selectOption.dataset.bibliografia || '[]');
        } catch (e) {
            console.error('Error parseando bibliografía:', e);
        }

        const claseData = {
            id: claseId,
            nombre: selectOption.dataset.nombre,
            descripcion: selectOption.dataset.descripcion,
            fecha: selectOption.dataset.fecha,
            youtube: selectOption.dataset.youtube,
            powerpoint: selectOption.dataset.powerpoint,
            bibliografia: bibliografia,
            instructores: selectOption.dataset.instructores
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
        const claseFecha = document.getElementById('claseFecha');
        const linksContainer = document.getElementById('linksContainer');
        
        // Formatear fecha para mostrar (CON FORMATO 24 HORAS)
        let fechaFormateada = '';
        if (claseData.fecha) {
            const fecha = new Date(claseData.fecha);
            fechaFormateada = fecha.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false  // 👈 FORMATO 24 HORAS
            });
            // Capitalizar primera letra
            fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        }
        
        claseNombre.innerHTML = `${claseData.nombre} <span class="periodo-badge">${this.nombresMeses[this.mesSeleccionado]} ${this.anoSeleccionado}</span>`;
        claseDescripcion.textContent = claseData.descripcion || 'Material de la clase grabada';
        claseFecha.textContent = `📅 ${fechaFormateada}`;
        
        // Limpiar instructores anteriores
        const instructoresExistente = document.getElementById('instructoresInfo');
        if (instructoresExistente) {
            instructoresExistente.remove();
        }
        
        if (claseData.instructores) {
            const instructoresElem = document.createElement('p');
            instructoresElem.id = 'instructoresInfo';
            instructoresElem.innerHTML = `👥 Instructores: ${claseData.instructores}`;
            instructoresElem.style.marginTop = '10px';
            instructoresElem.style.color = 'var(--text-secondary)';
            document.getElementById('claseInfo').appendChild(instructoresElem);
        }
        
        // Limpiar contenedor de enlaces
        linksContainer.innerHTML = '';
        
        // Mostrar YouTube si existe
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
        
        // Mostrar PowerPoint si existe
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
        
        // Mostrar bibliografía si existe
        if (claseData.bibliografia && claseData.bibliografia.length > 0) {
            claseData.bibliografia.forEach((url, index) => {
                linksContainer.innerHTML += `
                    <div class="link-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);" onclick="window.open('${url}', '_blank')">
                        <a href="${url}" target="_blank">
                            <div class="icon">📚</div>
                            <div class="title">Bibliografía ${index + 1}</div>
                            <div class="subtitle">Material complementario</div>
                            <div class="hover-info">Click para abrir</div>
                        </a>
                    </div>
                `;
            });
        }
        
        // Si no hay ningún enlace, mostrar mensaje
        if (!claseData.youtube && !claseData.powerpoint && (!claseData.bibliografia || claseData.bibliografia.length === 0)) {
            linksContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                    📭 No hay material disponible para esta clase
                </div>
            `;
        }
        
        // Ocultar filtros y formulario, mostrar enlaces
        document.querySelector('.filtros-container').style.display = 'none';
        document.getElementById('materialHistoricoForm').style.display = 'none';
        document.getElementById('sinClasesMensaje').style.display = 'none';
        materialLinks.classList.add('visible');
        
        this.mostrarMensaje('✅ Material disponible', 'success');
    }

    ocultarMaterial() {
        document.querySelector('.filtros-container').style.display = 'block';
        document.getElementById('materialHistoricoForm').style.display = 'none';
        document.getElementById('materialLinks').classList.remove('visible');
        document.getElementById('claseSeleccionada').value = '';
        
        // Resetear selectores
        document.getElementById('anoSeleccionado').value = '';
        document.getElementById('mesSeleccionado').innerHTML = '<option value="">Primero seleccione año</option>';
        document.getElementById('mesSeleccionado').disabled = true;
        this.anoSeleccionado = null;
        this.mesSeleccionado = null;
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
                bibliografia: claseData.bibliografia,
                fechaClase: claseData.fecha,
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
                    <td colspan="4" style="text-align: center; color: #666; padding: 20px;">
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
            
            const fechaClase = solicitud.fechaClase ? 
                new Date(solicitud.fechaClase).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false  // 👈 FORMATO 24 HORAS
                }) : 'Fecha no disponible';
            
            const fechaSolicitud = solicitud.fechaSolicitud ? 
                new Date(solicitud.fechaSolicitud).toLocaleString('es-AR', {
                    hour12: false  // 👈 FORMATO 24 HORAS
                }) : 
                'Fecha no disponible';
            
            const materialHTML = this.generarMaterialHTML(solicitud);
            
            row.innerHTML = `
                <td>${solicitud.claseNombre || solicitud.clase || 'N/A'}</td>
                <td>${fechaClase}</td>
                <td>${fechaSolicitud}</td>
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
        
        if (solicitud.bibliografia && solicitud.bibliografia.length > 0) {
            solicitud.bibliografia.forEach((url, index) => {
                enlaces.push(`<a href="${url}" target="_blank" title="Bibliografía ${index + 1}">📚 Biblio ${index + 1}</a>`);
            });
        }
        
        if (enlaces.length === 0) {
            return '<span style="color: #666;">Material no disponible</span>';
        }
        
        return enlaces.join(' | ');
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