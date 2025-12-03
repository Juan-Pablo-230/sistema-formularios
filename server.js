const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectToDatabase, getDB, mongoDB } = require('./database');

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
app.use(express.static(path.join(__dirname)));

// ==================== RUTAS DE DIAGNÓSTICO ====================
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('MONGODB_URI defined:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);

// ==================== RUTAS DE HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check request recibido');
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongoDB: mongoDB.isConnected ? 'CONECTADO' : 'NO CONECTADO'
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

app.get('/api/debug/routes', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas API disponibles',
        routes: [
            '/api/health',
            '/api/test/simple',
            '/api/init-db',
            '/api/auth/login (POST)',
            '/api/auth/register (POST)',
            '/api/auth/check-legajo/:legajo',
            '/api/inscripciones',
            '/api/inscripciones/verificar/:usuarioId/:clase',
            '/api/material/solicitudes',
            '/api/admin/usuarios',
            '/api/debug/mongo',
            '/api/env-check'
        ],
        timestamp: new Date().toISOString()
    });
});

app.get('/api/env-check', (req, res) => {
    res.json({
        mongoDB_URI: process.env.MONGODB_URI ? 'DEFINED' : 'NOT DEFINED',
        mongoDB_URI_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        allVariables: Object.keys(process.env).sort()
    });
});

// ==================== RUTAS DE AUTENTICACIÓN ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Intento de login recibido:', { identifier: req.body.identifier });
        const { identifier, password } = req.body;
        
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email/legajo y contraseña requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Buscar usuario por email o legajo
        const usuario = await db.collection('usuarios').findOne({
            $or: [
                { email: identifier },
                { legajo: identifier.toString() }
            ]
        });

        console.log('🔍 Usuario encontrado:', usuario ? 'Sí' : 'No');
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña
        if (usuario.password !== password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta'
            });
        }

        // Remover password de la respuesta
        const { password: _, ...usuarioSinPassword } = usuario;
        
        res.json({ 
            success: true, 
            message: 'Login exitoso', 
            data: usuarioSinPassword 
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registro de usuario:', req.body);
        const { apellidoNombre, legajo, turno, email, password, role = 'user' } = req.body;
        
        // Validaciones básicas
        if (!apellidoNombre || !legajo || !turno || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [
                { email: email },
                { legajo: legajo.toString() }
            ]
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o legajo ya están registrados' 
            });
        }
        
        // Crear nuevo usuario
        const nuevoUsuario = {
            apellidoNombre,
            legajo: legajo.toString(),
            turno,
            email,
            password,
            role,
            fechaRegistro: new Date()
        };
        
        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        
        // Remover password de la respuesta
        const { password: _, ...usuarioCreado } = nuevoUsuario;
        usuarioCreado._id = result.insertedId;
        
        res.json({ 
            success: true, 
            message: 'Usuario registrado exitosamente', 
            data: usuarioCreado 
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/auth/check-legajo/:legajo', async (req, res) => {
    try {
        const { legajo } = req.params;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const usuarioExistente = await db.collection('usuarios').findOne({ 
            legajo: legajo.toString() 
        });
        
        res.json({ 
            success: true, 
            data: { exists: !!usuarioExistente } 
        });
        
    } catch (error) {
        console.error('❌ Error verificando legajo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE INSCRIPCIONES ====================
app.post('/api/inscripciones', async (req, res) => {
    try {
        const { usuarioId, clase, turno } = req.body;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si ya está inscrito
        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: clase
        });
        
        if (inscripcionExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya estás inscrito en esta clase' 
            });
        }
        
        // Crear nueva inscripción
        const nuevaInscripcion = {
            usuarioId: new ObjectId(usuarioId),
            clase,
            turno,
            fecha: new Date()
        };
        
        await db.collection('inscripciones').insertOne(nuevaInscripcion);
        
        res.json({ 
            success: true, 
            message: 'Inscripción registrada exitosamente' 
        });
        
    } catch (error) {
        console.error('❌ Error registrando inscripción:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/inscripciones/verificar/:usuarioId/:clase', async (req, res) => {
    try {
        const { usuarioId, clase } = req.params;
        
        console.log('🔍 Verificando inscripción para:', { usuarioId, clase });
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Primero intentar como ObjectId
        let objectId;
        if (ObjectId.isValid(usuarioId)) {
            objectId = new ObjectId(usuarioId);
        } else {
            // Si no es ObjectId válido, buscar por legajo
            const usuario = await db.collection('usuarios').findOne({ 
                legajo: usuarioId.toString() 
            });
            
            if (!usuario) {
                return res.json({ 
                    success: true, 
                    data: { exists: false } 
                });
            }
            
            objectId = usuario._id;
        }
        
        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: objectId,
            clase: decodeURIComponent(clase)
        });
        
        console.log('📊 Inscripción existe:', !!inscripcionExistente);
        
        res.json({ 
            success: true, 
            data: { exists: !!inscripcionExistente } 
        });
        
    } catch (error) {
        console.error('❌ Error verificando inscripción:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/inscripciones', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Obtener todas las inscripciones con datos del usuario
        const inscripciones = await db.collection('inscripciones')
            .aggregate([
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' }
            ])
            .toArray();
        
        res.json({ 
            success: true, 
            data: inscripciones 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo inscripciones:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ==================== RUTAS DE MATERIAL ====================
app.post('/api/material/solicitudes', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('📦 POST /material/solicitudes - Headers user-id:', userHeader);
        
        if (!userHeader) {
            console.error('❌ No hay user-id en headers');
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado - Falta user-id en headers' 
            });
        }
        
        const { clase, email } = req.body;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si ya solicitó material para esta clase
        const solicitudExistente = await db.collection('material').findOne({
            usuarioId: new ObjectId(userHeader),
            clase: clase
        });
        
        if (solicitudExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya has solicitado material para esta clase' 
            });
        }
        
        // Crear nueva solicitud
        const nuevaSolicitud = {
            usuarioId: new ObjectId(userHeader),
            clase,
            email,
            fechaSolicitud: new Date()
        };
        
        await db.collection('material').insertOne(nuevaSolicitud);
        
        res.json({ 
            success: true, 
            message: 'Solicitud de material registrada exitosamente' 
        });
        
    } catch (error) {
        console.error('❌ Error registrando solicitud de material:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/material/solicitudes', async (req, res) => {
    try {
        const userHeader = req.headers['user-id'];
        
        console.log('📦 GET /material/solicitudes - Headers user-id:', userHeader);
        
        if (!userHeader) {
            console.error('❌ No hay user-id en headers');
            return res.status(401).json({ 
                success: false, 
                message: 'No autenticado - Falta user-id en headers' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Validar que el usuario existe
        const usuario = await db.collection('usuarios').findOne({ 
            _id: new ObjectId(userHeader) 
        });
        
        if (!usuario) {
            console.error('❌ Usuario no encontrado con ID:', userHeader);
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        console.log('✅ Usuario válido:', usuario.apellidoNombre);
        
        // Obtener solicitudes del usuario
        const solicitudes = await db.collection('material')
            .aggregate([
                {
                    $match: { usuarioId: new ObjectId(userHeader) }
                },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' }
            ])
            .toArray();
        
        console.log(`📊 Encontradas ${solicitudes.length} solicitudes`);
        
        res.json({ 
            success: true, 
            data: solicitudes 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo solicitudes de material:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== RUTAS DE ADMINISTRACIÓN ====================
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const usuarios = await db.collection('usuarios')
            .find({}, { projection: { password: 0 } }) // Excluir password
            .toArray();
        
        res.json({ 
            success: true, 
            data: usuarios 
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

app.post('/api/admin/usuarios', async (req, res) => {
    try {
        const { apellidoNombre, legajo, turno, email, password, role = 'user' } = req.body;
        
        if (!apellidoNombre || !legajo || !turno || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [
                { email: email },
                { legajo: legajo.toString() }
            ]
        });
        
        if (usuarioExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email o legajo ya están registrados' 
            });
        }
        
        // Crear nuevo usuario
        const nuevoUsuario = {
            apellidoNombre,
            legajo: legajo.toString(),
            turno,
            email,
            password,
            role,
            fechaRegistro: new Date()
        };
        
        const result = await db.collection('usuarios').insertOne(nuevoUsuario);
        
        // Remover password de la respuesta
        const { password: _, ...usuarioCreado } = nuevoUsuario;
        usuarioCreado._id = result.insertedId;
        
        res.json({ 
            success: true, 
            message: 'Usuario creado exitosamente', 
            data: usuarioCreado 
        });
        
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.put('/api/admin/usuarios/:id/rol', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['admin', 'advanced', 'user'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Rol inválido' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const result = await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { role: role } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Rol actualizado correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error actualizando rol:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// ==================== INICIALIZACIÓN DE BASE DE DATOS ====================
app.get('/api/init-db', async (req, res) => {
    try {
        console.log('🔄 Inicializando base de datos...');
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        // Verificar/Crear colecciones
        const collections = ['usuarios', 'inscripciones', 'material', 'clases'];
        
        for (const collectionName of collections) {
            const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
            
            if (!collectionExists) {
                console.log(`📝 Creando colección "${collectionName}"...`);
                await db.createCollection(collectionName);
                
                // Crear índices según la colección
                if (collectionName === 'usuarios') {
                    await db.collection(collectionName).createIndex({ email: 1 }, { unique: true });
                    await db.collection(collectionName).createIndex({ legajo: 1 }, { unique: true });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'inscripciones') {
                    await db.collection(collectionName).createIndex({ usuarioId: 1, clase: 1 }, { unique: true });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                } else if (collectionName === 'material') {
                    await db.collection(collectionName).createIndex({ usuarioId: 1, clase: 1 });
                    await db.collection(collectionName).createIndex({ fechaSolicitud: -1 });
                    console.log(`✅ Índices creados para "${collectionName}"`);
                }
                
                console.log(`✅ Colección "${collectionName}" creada`);
            } else {
                console.log(`✅ Colección "${collectionName}" ya existe`);
            }
        }
        
        // Crear usuario admin por defecto si no existe
        const adminExists = await db.collection('usuarios').findOne({ email: 'admin@example.com' });
        if (!adminExists) {
            const adminUser = {
                apellidoNombre: 'Administrador',
                legajo: '99999',
                turno: 'Turno mañana',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                fechaRegistro: new Date()
            };
            
            await db.collection('usuarios').insertOne(adminUser);
            console.log('✅ Usuario admin creado por defecto');
        }
        
        // Crear clase por defecto si no existe
        const claseExists = await db.collection('clases').findOne({ 
            nombre: 'Aislamientos y casos clínicos' 
        });
        if (!claseExists) {
            const clase = {
                nombre: "Aislamientos y casos clínicos",
                descripcion: "Lic. Romina Seminario, Lic. Mirta Díaz",
                fechaClase: new Date('2025-12-04'),
                fechaCierre: new Date('2025-12-04T10:00:00'),
                activa: true,
                instructores: ["Lic. Romina Seminario", "Lic. Mirta Díaz"]
            };
            
            await db.collection('clases').insertOne(clase);
            console.log('✅ Clase creada por defecto');
        }
        
        res.json({ 
            success: true, 
            message: 'Base de datos inicializada correctamente' 
        });
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error inicializando base de datos',
            error: error.message 
        });
    }
});

// ==================== RUTA POR DEFECTO ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== MANEJO DE RUTAS NO ENCONTRADAS ====================
app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            message: 'Ruta API no encontrada: ' + req.path 
        });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ==================== INICIAR SERVIDOR ====================
async function startServer() {
    try {
        // Intentar conectar a MongoDB primero
        console.log('\n🔄 Intentando conectar a MongoDB...');
        try {
            await mongoDB.connect();
            console.log('✅ MongoDB conectado exitosamente');
        } catch (dbError) {
            console.warn('⚠️ MongoDB no disponible:', dbError.message);
            console.log('⚠️ El servidor iniciará sin base de datos');
        }
        
        // Iniciar servidor
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('\n==========================================');
            console.log('✅ SERVIDOR INICIADO CORRECTAMENTE');
            console.log(`🔧 Puerto: ${PORT}`);
            console.log(`🌍 URL: http://0.0.0.0:${PORT}`);
            console.log(`🏥 Health: /api/health`);
            console.log(`🧪 Test: /api/test/simple`);
            console.log(`🔄 Init DB: /api/init-db`);
            console.log('==========================================\n');
        });
        
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

// Iniciar servidor
startServer();