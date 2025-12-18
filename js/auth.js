console.log('auth.js cargado - Versión Optimizada');

class AuthSystem {
    constructor() {
        console.log('AuthSystem inicializado');
        this.apiBaseUrl = window.location.origin + '/api';
        this.currentUser = null;
        this.init();
    }

    async makeRequest(endpoint, data = null, method = 'POST') {
        try {
            const user = this.getCurrentUser();
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (user && user._id) {
                headers['user-id'] = user._id;
            }
            
            const options = {
                method: method,
                headers: headers
            };
            
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            if (!response.ok || !result.success) {
                throw new Error(result.message || `Error ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error('Error en la solicitud:', error);
            throw error;
        }
    }

    async login(identifier, password) {
        try {
            const result = await this.makeRequest('/auth/login', {
                identifier: identifier,
                password: password
            });
            
            this.currentUser = result.data;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            console.log('✅ Login exitoso:', this.currentUser.apellidoNombre);
            return this.currentUser;
            
        } catch (error) {
            throw error;
        }
    }

    async register(userData) {
        return await this.makeRequest('/auth/register', userData);
    }

    async checkLegajo(legajo) {
        try {
            const result = await this.makeRequest(`/auth/check-legajo/${legajo}`, null, 'GET');
            return result.data.exists;
        } catch (error) {
            console.error('Error verificando legajo:', error);
            return false;
        }
    }

    // Métodos de estado
    isLoggedIn() { return this.currentUser !== null; }
    isAdmin() { return this.currentUser?.role === 'admin'; }
    isAdvancedUser() { return this.currentUser?.role === 'advanced'; }
    getCurrentUser() { return this.currentUser; }
    
    logout() { 
        this.currentUser = null; 
        localStorage.removeItem('currentUser'); 
        console.log('✅ Sesión cerrada');
    }

    init() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            console.log('Usuario cargado desde localStorage');
        }
    }

    validatePassword(password, confirmPassword) {
        if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
        }
        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        return true;
    }

    getUserRoleText(role = null) {
        const userRole = role || this.currentUser?.role;
        const roles = {
            'admin': '👑 Administrador',
            'advanced': '⭐ Usuario Avanzado', 
            'user': '👤 Usuario'
        };
        return roles[userRole] || '👤 Usuario';
    }
}

const authSystem = new AuthSystem();