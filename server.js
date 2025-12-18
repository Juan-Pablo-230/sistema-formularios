const express = require('express');
const cors = require('cors');
const { ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config();

const { mongoDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración básica
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        mongoDB: mongoDB.isConnected ? 'CONECTADO' : 'NO CONECTADO'
    });
});

// Rutas de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        if (!identifier || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Credenciales requeridas' 
            });
        }
        
        const db = await mongoDB.getDatabaseSafe('formulario');
        const usuario = await db.collection('usuarios').findOne({
            $or: [
                { email: identifier },
                { legajo: identifier.toString() }
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
            message: 'Error interno'
        });
    }
});

// Rutas principales
app.post('/api/inscripciones', async (req, res) => {
    try {
        const { usuarioId, clase, turno } = req.body;
        const db = await mongoDB.getDatabaseSafe('formulario');
        
        const existe = await db.collection('inscripciones').findOne({
            usuarioId: new ObjectId(usuarioId),
            clase: clase
        });
        
        if (existe) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya inscrito' 
            });
        }
        
        await db.collection('inscripciones').insertOne({
            usuarioId: new ObjectId(usuarioId),
            clase,
            turno,
            fecha: new Date()
        });
        
        res.json({ success: true, message: 'Inscripción registrada' });
        
    } catch (error) {
        console.error('Error registrando inscripción:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
});

// Más rutas optimizadas...

// Iniciar servidor
async function startServer() {
    try {
        await mongoDB.connect();
        console.log('✅ MongoDB conectado');
        
        app.listen(PORT, () => {
            console.log(`✅ Servidor en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

startServer();