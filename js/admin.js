console.log('admin.js cargado - Versión Optimizada');

class AdminSystem {
    constructor() {
        this.inscripcionesData = [];
        this.usuariosData = [];
        this.solicitudesMaterialData = [];
        this.vistaActual = 'inscripciones';
    }

    verifyAdminAccess() {
        if (!authSystem.isLoggedIn()) {
            window.location.href = '/index.html';
            return false;
        }
        
        if (!authSystem.isAdmin() && !authSystem.isAdvancedUser()) {
            alert('No tienes permisos para acceder al panel');
            window.location.href = '/index.html';
            return false;
        }
        
        return true;
    }

    async loadInscripciones() {
        try {
            const result = await authSystem.makeRequest('/inscripciones', null, 'GET');
            this.inscripcionesData = result.data || [];
            return this.inscripcionesData;
        } catch (error) {
            console.error('Error cargando inscripciones:', error);
            return [];
        }
    }

    async loadUsuarios() {
        try {
            const result = await authSystem.makeRequest('/admin/usuarios', null, 'GET');
            this.usuariosData = result.data || [];
            return this.usuariosData;
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            return [];
        }
    }

    async loadSolicitudesMaterial() {
        try {
            const result = await authSystem.makeRequest('/material/solicitudes', null, 'GET');
            this.solicitudesMaterialData = result.data || [];
            return this.solicitudesMaterialData;
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            return [];
        }
    }

    showInscripcionesTable(inscripciones) {
        const tbody = document.getElementById('inscripcionesBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (inscripciones.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        No hay inscripciones registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        inscripciones.forEach((insc, index) => {
            const fecha = insc.fecha ? new Date(insc.fecha).toLocaleString('es-AR') : 'N/A';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${insc.usuario?.apellidoNombre || 'N/A'}</td>
                <td>${insc.usuario?.legajo || 'N/A'}</td>
                <td>${insc.clase || 'N/A'}</td>
                <td>${insc.turno || 'N/A'}</td>
                <td>${insc.usuario?.email || 'N/A'}</td>
                <td>${fecha}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async init() {
        if (!this.verifyAdminAccess()) return;
        
        const user = authSystem.getCurrentUser();
        document.getElementById('adminName').textContent = user.apellidoNombre;
        document.getElementById('adminEmail').textContent = user.email;
        
        // Cargar datos
        await this.loadInscripciones();
        await this.loadUsuarios();
        
        // Mostrar datos iniciales
        this.showInscripcionesTable(this.inscripcionesData);
        document.getElementById('totalInscripciones').textContent = this.inscripcionesData.length;
        
        // Configurar eventos
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Navegación
        document.getElementById('btnInscripciones').addEventListener('click', () => {
            this.cambiarVista('inscripciones');
        });
        
        document.getElementById('btnUsuarios').addEventListener('click', () => {
            if (authSystem.isAdmin()) {
                this.cambiarVista('usuarios');
            } else {
                alert('Solo administradores');
            }
        });
        
        document.getElementById('btnMaterial').addEventListener('click', () => {
            if (authSystem.isAdmin() || authSystem.isAdvancedUser()) {
                this.cambiarVista('material');
            }
        });
        
        // Botones de acción
        document.getElementById('refreshBtn').addEventListener('click', async () => {
            await this.loadInscripciones();
            this.showInscripcionesTable(this.inscripcionesData);
        });
        
        document.getElementById('homeBtn').addEventListener('click', () => {
            window.location.href = '/index.html';
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
            window.location.href = '/index.html';
        });
    }

    cambiarVista(vista) {
        this.vistaActual = vista;
        
        // Ocultar todas las secciones
        ['inscripcionesSection', 'usuariosSection', 'materialSection'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        ['statsInscripciones', 'statsUsuarios', 'statsMaterial'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Mostrar la seleccionada
        const section = document.getElementById(`${vista}Section`);
        const stats = document.getElementById(`stats${vista.charAt(0).toUpperCase() + vista.slice(1)}`);
        
        if (section) section.style.display = 'block';
        if (stats) stats.style.display = 'grid';
        
        // Actualizar botones
        ['btnInscripciones', 'btnUsuarios', 'btnMaterial'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`btn${vista.charAt(0).toUpperCase() + vista.slice(1)}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}

const adminSystem = new AdminSystem();
document.addEventListener('DOMContentLoaded', () => adminSystem.init());