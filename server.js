const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectToDatabase, getDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN INICIAL ====================
console.log('🚀 Iniciando Sistema de Formularios MongoDB...');
console.log('📋 Environment check:');
console.log('- Node version:', process.version);
console.log('- PORT:', PORT);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'DEFINIDA' : 'NO DEFINIDA');

// ==================== MIDDLEWARES BÁSICOS ====================
app.use(cors());
app.use(express.json());

// ==================== RUTAS DE HEALTH CHECK (PRIMERO) ====================
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check request recibido');
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/api/test/simple', (req, res) => {
    console.log('✅ Ruta de prueba GET llamada');
    res.json({ 
        success: true, 
        message: 'Test GET funciona',
        timestamp: new Date().toISOString()
    });
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================
const authenticate = async (req, res, next) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado - Falta user-id en headers' 
            });
        }

        const db = getDB();
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userId) 
        });
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Error de autenticación', 
            error: error.message 
        });
    }
};

// ==================== RUTAS DE AUTENTICACIÓN SIMPLIFICADAS ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Intento de login');
        const { identifier, password } = req.body;
        
        const db = getDB();
        
        // Buscar usuario
        const usuario = await db.collection('usuarios').findOne({
            $or: [
                { email: identifier },
                { legajo: identifier }
            ]
        });

        if (!usuario || usuario.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales incorrectas'
            });
        }

        const { password: _, ...usuarioSinPassword } = usuario;
        res.json({ 
            success: true, 
            message: 'Login exitoso', 
            data: usuarioSinPassword 
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE DIAGNÓSTICO ====================
app.get('/api/test-connection', async (req, res) => {
    try {
        console.log('🧪 Test de conexión a MongoDB');
        
        if (!process.env.MONGODB_URI) {
            return res.json({
                success: false,
                message: 'MONGODB_URI no definida',
                timestamp: new Date().toISOString()
            });
        }
        
        // Intentar conexión simple
        const { mongoDB } = require('./database');
        
        res.json({
            success: true,
            message: '✅ Servidor funcionando',
            mongoDB: {
                isConnected: mongoDB.isConnected,
                connectionAttempts: mongoDB.connectionAttempts
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en test-connection:', error);
        res.json({
            success: false,
            message: 'Error en test',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/debug/db', async (req, res) => {
    try {
        console.log('=== DEBUG DATABASE ===');
        
        const hasUri = !!process.env.MONGODB_URI;
        console.log('MONGODB_URI definida:', hasUri);
        
        const { mongoDB } = require('./database');
        
        res.json({
            success: true,
            details: {
                hasUri: hasUri,
                isConnected: mongoDB.isConnected,
                connectionAttempts: mongoDB.connectionAttempts,
                nodeVersion: process.version
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Debug DB error:', error);
        res.status(500).json({
            success: false,
            message: 'Error en debug',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== ARCHIVOS ESTÁTICOS ====================
app.use(express.static(path.join(__dirname)));

// Ruta para index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'Ruta API no encontrada: ' + req.path,
            availableRoutes: [
                '/api/health',
                '/api/test/simple', 
                '/api/test-connection',
                '/api/debug/db',
                '/api/auth/login'
            ]
        });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ==================== INICIALIZAR SERVIDOR ====================
async function startServer() {
    try {
        console.log('\n🔄 Intentando conectar a MongoDB...');
        
        // Intentar conectar a MongoDB (pero no bloquear el inicio)
        setTimeout(async () => {
            try {
                await connectToDatabase();
                console.log('✅ MongoDB conectado exitosamente');
            } catch (dbError) {
                console.warn('⚠️ MongoDB no disponible:', dbError.message);
            }
        }, 1000);
        
        // Iniciar servidor
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n==========================================');
            console.log('✅ SERVIDOR INICIADO CORRECTAMENTE');
            console.log(`🔧 Puerto: ${PORT}`);
            console.log(`🌍 URL: http://0.0.0.0:${PORT}`);
            console.log(`🏥 Health: /api/health`);
            console.log(`🧪 Test: /api/test/simple`);
            console.log('==========================================\n');
        });
        
        // Manejo de errores del servidor
        server.on('error', (error) => {
            console.error('❌ Error del servidor:', error.message);
            if (error.code === 'EADDRINUSE') {
                console.error(`⚠️ Puerto ${PORT} en uso`);
            }
        });
        
        return server;
    } catch (error) {
        console.error('❌ ERROR iniciando servidor:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Iniciar servidor inmediatamente
startServer();