class AuthSystem {
    constructor() {
        this.apiBaseUrl = 'https://sistema-formularios-dpfw.onrender.com/api';
        this.currentUser = null;
        this.init();
    }

    async makeRequest(endpoint, data = null, method = 'POST') {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            const result = await response.json();
            
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
        const result = await this.makeRequest('/auth/login', { identifier, password });
        this.currentUser = result.data;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return this.currentUser;
    }

    async register(userData) {
        return await this.makeRequest('/auth/register', userData);
    }

    async checkLegajo(legajo) {
        const result = await this.makeRequest(`/auth/check-legajo/${legajo}`, null, 'GET');
        return result.data.exists;
    }

    isLoggedIn() { return this.currentUser !== null; }
    isAdmin() { return this.currentUser?.role === 'admin'; }
    isAdvanced() { return this.currentUser?.role === 'advanced'; }
    getCurrentUser() { return this.currentUser; }
    logout() { 
        this.currentUser = null; 
        localStorage.removeItem('currentUser'); 
    }

    init() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) this.currentUser = JSON.parse(savedUser);
    }
}

const authSystem = new AuthSystem();