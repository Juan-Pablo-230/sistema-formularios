const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectToDatabase, getDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json());

// ==================== RUTAS DE DIAGNÓSTICO ====================
app.get('/api/debug/db', async (req, res) => {
    try {
        console.log('=== DEBUG DATABASE ===');
        
        // Verificar si MONGODB_URI está definida
        const hasUri = !!process.env.MONGODB_URI;
        console.log('MONGODB_URI definida:', hasUri);
        
        if (hasUri) {
            // Mostrar URI (enmascarada)
            const maskedUri = process.env.MONGODB_URI.replace(
                /mongodb\+srv:\/\/[^:]+:[^@]+@/, 
                'mongodb+srv://***:***@'
            );
            console.log('URI (masked):', maskedUri);
        }
        
        // Intentar conexión
        const { mongoDB } = require('./database');
        const isConnected = mongoDB.isConnected;
        console.log('DB isConnected:', isConnected);
        
        if (isConnected) {
            const db = getDB();
            await db.command({ ping: 1 });
            
            // Listar bases de datos
            const adminDb = mongoDB.client.db().admin();
            const databases = await adminDb.listDatabases();
            
            res.json({
                success: true,
                message: '✅ MongoDB conectado correctamente',
                details: {
                    hasUri: hasUri,
                    isConnected: isConnected,
                    databases: databases.databases.map(db => db.name),
                    uriMasked: hasUri ? process.env.MONGODB_URI.replace(
                        /mongodb\+srv:\/\/[^:]+:[^@]+@/, 
                        'mongodb+srv://***:***@'
                    ) : null
                }
            });
        } else {
            res.json({
                success: false,
                message: '❌ MongoDB no conectado',
                details: {
                    hasUri: hasUri,
                    isConnected: isConnected,
                    error: 'La conexión no está establecida. Llama a connectToDatabase() primero.'
                }
            });
        }
        
    } catch (error) {
        console.error('Debug DB error:', error);
        res.status(500).json({
            success: false,
            message: 'Error en debug',
            error: error.message,
            stack: error.stack
        });
    }
});
// ==================== RUTAS DE HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health-complete', async (req, res) => {
    try {
        const db = getDB();
        await db.command({ ping: 1 });
        res.json({ 
            status: 'OK', 
            message: 'Servidor y MongoDB funcionando',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            message: 'Servidor funciona pero MongoDB no',
            error: error.message 
        });
    }
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================
const authenticate = async (req, res, next) => {
    try {
        const userId = req.headers['user-id'];
        if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

        const db = getDB();
        const usuario = await db.collection('usuarios').findOne({ _id: new ObjectId(userId) });
        if (!usuario) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

        req.usuario = usuario;
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        res.status(401).json({ success: false, message: 'Error de autenticación', error: error.message });
    }
};

// ==================== RUTAS DE AUTENTICACIÓN ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const db = getDB();

        const usuario = await db.collection('usuarios').findOne({
            $or: [
                { email: identifier },
                { legajo: identifier }
            ]
        });

        if (!usuario || usuario.password !== password) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }

        const { password: _, ...usuarioSinPassword } = usuario;
        res.json({ success: true, message: 'Login exitoso', data: usuarioSinPassword });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { apellidoNombre, legajo, email, turno, password, role = 'user' } = req.body;
        const db = getDB();

        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [{ legajo }, { email }]
        });

        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'El legajo o email ya están registrados' });
        }

        const nuevoUsuario = {
            apellidoNombre,
            legajo,
            email,
            turno,
            password,
            role,
            fechaRegistro: new Date(),
            ultimaActualizacion: new Date()
        };

        const resultado = await db.collection('usuarios').insertOne(nuevoUsuario);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                _id: resultado.insertedId,
                apellidoNombre,
                legajo,
                email,
                turno,
                role
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/auth/check-legajo/:legajo', async (req, res) => {
    try {
        const { legajo } = req.params;
        const db = getDB();

        const usuarioExistente = await db.collection('usuarios').findOne({ legajo });
        res.json({ success: true, data: { exists: !!usuarioExistente } });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== RUTAS DE INSCRIPCIONES ====================
app.post('/api/inscripciones', async (req, res) => {
    try {
        const { usuarioId, clase, turno } = req.body;
        const db = getDB();

        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: clase
        });

        if (inscripcionExistente) {
            return res.status(400).json({ success: false, message: 'Ya existe una inscripción para esta clase' });
        }

        const nuevaInscripcion = {
            usuarioId: new ObjectId(usuarioId),
            clase,
            turno,
            fecha: new Date()
        };

        const resultado = await db.collection('inscripciones').insertOne(nuevaInscripcion);

        res.status(201).json({
            success: true,
            message: 'Inscripción registrada exitosamente',
            data: { id: resultado.insertedId }
        });

    } catch (error) {
        console.error('Error creando inscripción:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/inscripciones/verificar/:usuarioId/:clase', async (req, res) => {
    try {
        const { usuarioId, clase } = req.params;
        const db = getDB();

        const inscripcionExistente = await db.collection('inscripciones').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: decodeURIComponent(clase)
        });

        res.json({ success: true, data: { exists: !!inscripcionExistente } });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/inscripciones', async (req, res) => {
    try {
        const { clase, page = 1, limit = 50 } = req.query;
        const db = getDB();

        const filtro = {};
        if (clase && clase !== 'todas') filtro.clase = clase;

        const inscripciones = await db.collection('inscripciones')
            .aggregate([
                { $match: filtro },
                { $sort: { fecha: -1 } },
                { $skip: (page - 1) * limit },
                { $limit: parseInt(limit) },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuarioId',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                { $unwind: '$usuario' },
                { $project: { 'usuario.password': 0 } }
            ])
            .toArray();

        const total = await db.collection('inscripciones').countDocuments(filtro);

        res.json({
            success: true,
            data: inscripciones,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });

    } catch (error) {
        console.error('Error obteniendo inscripciones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/inscripciones/estadisticas', async (req, res) => {
    try {
        const db = getDB();

        const [total, porClase] = await Promise.all([
            db.collection('inscripciones').countDocuments(),
            db.collection('inscripciones').aggregate([
                { $group: { _id: '$clase', count: { $sum: 1 } } }
            ]).toArray()
        ]);

        res.json({
            success: true,
            data: {
                total: total,
                porClase: porClase
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== RUTAS DE ADMINISTRACIÓN ====================
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const db = getDB();
        
        const usuarios = await db.collection('usuarios')
            .find({}, { projection: { password: 0 } })
            .sort({ fechaRegistro: -1 })
            .toArray();

        const stats = await db.collection('usuarios').aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]).toArray();

        res.json({
            success: true,
            data: usuarios,
            estadisticas: {
                total: usuarios.length,
                admin: stats.find(s => s._id === 'admin')?.count || 0,
                advanced: stats.find(s => s._id === 'advanced')?.count || 0,
                user: stats.find(s => s._id === 'user')?.count || 0
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.post('/api/admin/usuarios', async (req, res) => {
    try {
        const { apellidoNombre, legajo, email, turno, role = 'user' } = req.body;
        const db = getDB();

        const usuarioExistente = await db.collection('usuarios').findOne({
            $or: [{ legajo }, { email }]
        });

        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'El legajo o email ya están registrados' });
        }

        const nuevoUsuario = {
            apellidoNombre,
            legajo,
            email,
            turno,
            password: 'temp123',
            role,
            fechaRegistro: new Date(),
            ultimaActualizacion: new Date()
        };

        const resultado = await db.collection('usuarios').insertOne(nuevoUsuario);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                _id: resultado.insertedId,
                apellidoNombre,
                legajo,
                email,
                turno,
                role
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.put('/api/admin/usuarios/:id/rol', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const db = getDB();

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { role, ultimaActualizacion: new Date() } }
        );

        res.json({ success: true, message: 'Rol actualizado correctamente' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const session = db.client.startSession();
        await session.withTransaction(async () => {
            await db.collection('inscripciones').deleteMany({ usuarioId: new ObjectId(id) }, { session });
            await db.collection('usuarios').deleteOne({ _id: new ObjectId(id) }, { session });
        });
        await session.endSession();

        res.json({ success: true, message: 'Usuario eliminado correctamente' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.put('/api/admin/usuarios/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const db = getDB();

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    password: newPassword,
                    ultimaActualizacion: new Date() 
                } 
            }
        );

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== RUTAS DE USUARIOS ====================
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
    try {
        if (!req.usuario.role || !['admin', 'advanced'].includes(req.usuario.role)) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }

        const db = getDB();

        const [totalUsuarios, totalInscripciones, usuariosPorRol, inscripcionesPorClase] = await Promise.all([
            db.collection('usuarios').countDocuments(),
            db.collection('inscripciones').countDocuments(),
            db.collection('usuarios').aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]).toArray(),
            db.collection('inscripciones').aggregate([
                { $group: { _id: '$clase', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        ]);

        const stats = {
            usuarios: {
                total: totalUsuarios,
                admin: usuariosPorRol.find(r => r._id === 'admin')?.count || 0,
                advanced: usuariosPorRol.find(r => r._id === 'advanced')?.count || 0,
                user: usuariosPorRol.find(r => r._id === 'user')?.count || 0
            },
            inscripciones: {
                total: totalInscripciones
            },
            clasesPopulares: inscripcionesPorClase
        };

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.put('/api/usuarios/perfil', authenticate, async (req, res) => {
    try {
        const { apellidoNombre, legajo, turno, email, password, currentPassword } = req.body;
        const usuarioId = req.usuario._id;
        const db = getDB();

        if (password) {
            const usuarioActual = await db.collection('usuarios').findOne({ _id: new ObjectId(usuarioId) });
            if (!usuarioActual || usuarioActual.password !== currentPassword) {
                return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
            }
        }

        if (legajo !== req.usuario.legajo) {
            const legajoExistente = await db.collection('usuarios').findOne({ 
                legajo, 
                _id: { $ne: new ObjectId(usuarioId) } 
            });
            if (legajoExistente) {
                return res.status(400).json({ success: false, message: 'El legajo ya está en uso' });
            }
        }

        if (email !== req.usuario.email) {
            const emailExistente = await db.collection('usuarios').findOne({ 
                email, 
                _id: { $ne: new ObjectId(usuarioId) } 
            });
            if (emailExistente) {
                return res.status(400).json({ success: false, message: 'El email ya está en uso' });
            }
        }

        const updateData = {
            apellidoNombre,
            legajo,
            turno,
            email,
            ultimaActualizacion: new Date()
        };

        if (password) {
            updateData.password = password;
        }

        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(usuarioId) },
            { $set: updateData }
        );

        const usuarioActualizado = await db.collection('usuarios').findOne(
            { _id: new ObjectId(usuarioId) },
            { projection: { password: 0 } }
        );

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            data: usuarioActualizado
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.delete('/api/usuarios/cuenta', authenticate, async (req, res) => {
    try {
        const { currentPassword } = req.body;
        const usuarioId = req.usuario._id;
        const db = getDB();

        const usuarioActual = await db.collection('usuarios').findOne({ _id: new ObjectId(usuarioId) });
        if (!usuarioActual || usuarioActual.password !== currentPassword) {
            return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
        }

        const session = db.client.startSession();
        
        try {
            await session.withTransaction(async () => {
                await db.collection('inscripciones').deleteMany(
                    { usuarioId: new ObjectId(usuarioId) }, 
                    { session }
                );
                
                await db.collection('usuarios').deleteOne(
                    { _id: new ObjectId(usuarioId) }, 
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        res.json({
            success: true,
            message: 'Cuenta eliminada correctamente'
        });

    } catch (error) {
        console.error('Error eliminando cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/usuarios/perfil', authenticate, async (req, res) => {
    try {
        const db = getDB();
        const usuario = await db.collection('usuarios').findOne(
            { _id: new ObjectId(req.usuario._id) },
            { projection: { password: 0 } }
        );

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({ success: true, data: usuario });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== RUTAS DE MATERIAL ====================
app.get('/api/material/test', (req, res) => {
    console.log('✅ GET /api/material/test llamado');
    res.json({ 
        success: true, 
        message: 'Ruta GET de material funciona',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/material/test', (req, res) => {
    console.log('✅ POST /api/material/test llamado', req.body);
    res.json({
        success: true,
        message: 'Ruta POST de material funciona',
        data: req.body,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/material/solicitudes', authenticate, async (req, res) => {
    try {
        console.log('📨 POST /api/material/solicitudes recibido');
        const { clase, email } = req.body;
        const usuarioId = req.usuario._id;
        const db = getDB();

        console.log('Datos recibidos:', { clase, email, usuarioId });

        const solicitudExistente = await db.collection('material').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: clase
        });

        if (solicitudExistente) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya ha solicitado material para esta clase' 
            });
        }

        const nuevaSolicitud = {
            usuarioId: new ObjectId(usuarioId),
            clase,
            email,
            usuario: {
                apellidoNombre: req.usuario.apellidoNombre,
                legajo: req.usuario.legajo,
                email: req.usuario.email
            },
            fechaSolicitud: new Date()
        };

        console.log('Creando solicitud:', nuevaSolicitud);
        
        const resultado = await db.collection('material').insertOne(nuevaSolicitud);

        res.status(201).json({
            success: true,
            message: 'Solicitud registrada exitosamente',
            data: { id: resultado.insertedId }
        });

    } catch (error) {
        console.error('❌ Error creando solicitud de material:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

app.get('/api/material/solicitudes', authenticate, async (req, res) => {
    try {
        console.log('📥 GET /api/material/solicitudes recibido');
        const { clase } = req.query;
        const db = getDB();

        console.log('Usuario autenticado:', req.usuario._id, 'Rol:', req.usuario.role);

        const filtro = {};
        if (clase && clase !== 'todas') filtro.clase = clase;

        const esAdmin = req.usuario.role === 'admin';
        const esAvanzado = req.usuario.role === 'advanced';

        console.log('Permisos:', { esAdmin, esAvanzado });

        if (!esAdmin && !esAvanzado) {
            filtro.usuarioId = new ObjectId(req.usuario._id);
            console.log('Filtro para usuario regular:', filtro);
        }

        const solicitudes = await db.collection('material')
            .find(filtro)
            .sort({ fechaSolicitud: -1 })
            .toArray();

        console.log(`✅ ${solicitudes.length} solicitudes encontradas`);

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

app.delete('/api/material/solicitudes/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const esAdmin = req.usuario.role === 'admin';
        const esAvanzado = req.usuario.role === 'advanced';

        if (!esAdmin && !esAvanzado) {
            return res.status(403).json({ 
                success: false, 
                message: 'No autorizado para eliminar solicitudes' 
            });
        }

        const resultado = await db.collection('material').deleteOne({
            _id: new ObjectId(id)
        });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada' 
            });
        }

        res.json({
            success: true,
            message: 'Solicitud eliminada correctamente'
        });

    } catch (error) {
        console.error('Error eliminando solicitud de material:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.get('/api/material/estadisticas', authenticate, async (req, res) => {
    try {
        const db = getDB();

        const [total, hoy, porClase] = await Promise.all([
            db.collection('material').countDocuments(),
            db.collection('material').countDocuments({
                fechaSolicitud: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }),
            db.collection('material').aggregate([
                { $group: { _id: '$clase', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).toArray()
        ]);

        res.json({
            success: true,
            data: {
                total,
                hoy,
                porClase
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de material:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ==================== ARCHIVOS ESTÁTICOS ====================
app.use(express.static(path.join(__dirname)));

// Rutas específicas para archivos HTML
app.get('/admin/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.get('/material.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'material.html'));
});

// Rutas para archivos en carpetas
app.get('/:folder/:file', (req, res) => {
    const { folder, file } = req.params;
    const filePath = path.join(__dirname, folder, file);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }
});

// Ruta para index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ success: false, message: 'Ruta API no encontrada' });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// ==================== INICIALIZAR SERVIDOR ====================
async function initializeServer() {
    try {
        console.log('🔧 Inicializando servidor...');
        
        // CONEXIÓN A MONGODB (obligatoria)
        try {
            console.log('🔄 Conectando a MongoDB...');
            await connectToDatabase();
            console.log('✅ MongoDB conectado exitosamente');
            
            // Verificar conexión funcionando
            const db = getDB();
            await db.command({ ping: 1 });
            console.log('✅ Ping a MongoDB exitoso');
            
        } catch (dbError) {
            console.error('❌ ERROR CRÍTICO: No se pudo conectar a MongoDB');
            console.error('Detalles:', dbError.message);
            
            // Crear un DB mock para development/testing
            console.warn('⚠️ Usando modo fallback (sin base de datos)');
            // Continuar sin DB para debugging
        }

        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('=================================');
            console.log('🚀 SERVICIOS DISPONIBLES:');
            console.log(`🔧 Puerto: ${PORT}`);
            console.log(`🌍 Health Check: /api/health`);
            console.log(`🔧 Test DB: /api/debug/db`);
            console.log(`🔧 Test GET: /api/test/simple`);
            console.log(`🔧 Test POST: /api/test/simple`);
            console.log('=================================');
        });

        return server;
    } catch (error) {
        console.error('❌ ERROR CRÍTICO iniciando servidor:', error);
        process.exit(1);
    }
}

// Inicializar
initializeServer();