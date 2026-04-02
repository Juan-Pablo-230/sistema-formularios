const { MongoClient, ServerApiVersion } = require('mongodb');

class MongoDB {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
  }

  async connect() {
    try {
      this.connectionAttempts++;
      console.log(`🔄 Intento de conexión #${this.connectionAttempts}`);
      
      const uri = process.env.MONGODB_URI;
      
      // DEBUG: Mostrar información de la URI
      console.log('=== MONGODB CONNECTION DEBUG ===');
      console.log('URI defined:', !!uri);
      console.log('URI length:', uri ? uri.length : 0);
      
      if (uri) {
        // Mostrar URI enmascarada para seguridad
        const maskedURI = uri.replace(
          /mongodb\+srv:\/\/[^:]+:[^@]+@/, 
          'mongodb+srv://***:***@'
        );
        console.log('Masked URI:', maskedURI);
      }
      
      if (!uri) {
        throw new Error('MONGODB_URI no está definida en las variables de entorno');
      }
      
      // Validar formato básico
      if (!uri.startsWith('mongodb+srv://')) {
        throw new Error('URI debe comenzar con mongodb+srv://');
      }

      console.log('🔌 Conectando a MongoDB Atlas...');
      
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });

      console.log('⏳ Estableciendo conexión...');
      await this.client.connect();
      
      // Verificar conexión con ping
      await this.client.db().admin().command({ ping: 1 });
      
      this.isConnected = true;
      console.log('✅ Conectado a MongoDB Atlas correctamente');
      
      // Listar bases de datos disponibles
      const databases = await this.client.db().admin().listDatabases();
      console.log('📊 Bases de datos disponibles:', databases.databases.map(db => db.name));
      
      return this.client;
      
    } catch (error) {
      console.error('❌ ERROR conectando a MongoDB Atlas:');
      console.error('- Message:', error.message);
      console.error('- Error code:', error.code || 'N/A');
      console.error('- Error name:', error.name);
      
      // Información adicional según el tipo de error
      if (error.message.includes('authentication')) {
        console.error('⚠️ Error de autenticación - Verifica usuario/contraseña');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('⚠️ Error de DNS - Verifica el hostname del cluster');
      } else if (error.message.includes('timed out')) {
        console.error('⚠️ Timeout - Verifica Network Access en MongoDB Atlas');
      } else if (error.message.includes('bad auth')) {
        console.error('⚠️ Credenciales incorrectas - Verifica usuario y contraseña');
      }
      
      this.isConnected = false;
      
      // Intentar auto-reconexión en background
      if (this.connectionAttempts < 3) {
        setTimeout(() => {
          console.log('🔄 Intentando auto-reconexión...');
          this.connect().catch(e => console.error('Auto-reconexión falló:', e.message));
        }, 5000);
      }
      
      throw error;
    }
  }

  // Método seguro que intenta reconectar si es necesario
  async getDatabaseSafe(dbName) {
    if (!this.isConnected) {
      console.warn('⚠️ No conectado, intentando reconectar automáticamente...');
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ No se pudo reconectar:', error.message);
        throw new Error('No hay conexión a la base de datos');
      }
    }
    
    return this.client.db(dbName);
  }

  // Método original (mantener compatibilidad)
  getDatabase(dbName) {
    if (!this.isConnected) {
      throw new Error('No hay conexión a la base de datos');
    }
    return this.client.db(dbName);
  }

  // Métodos específicos para tus bases de datos
  getUsuariosDB() {
    return this.getDatabaseSafe('usuario');
  }

  getFormulariosDB() {
    return this.getDatabaseSafe('formulario');
  }

  getMaterialDB() {
    return this.getDatabaseSafe('material');
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
}

const mongoDB = new MongoDB();

// Auto-conectar al iniciar
setTimeout(async () => {
  try {
    await mongoDB.connect();
    console.log('✅ Auto-conexión inicial exitosa');
  } catch (error) {
    console.log('⚠️ Auto-conexión falló, se intentará en las primeras solicitudes');
  }
}, 1000);

process.on('SIGINT', async () => {
  await mongoDB.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoDB.close();
  process.exit(0);
});

module.exports = {
  connectToDatabase: () => mongoDB.connect(),
  getDB: (dbName) => mongoDB.getDatabaseSafe(dbName),  // Usar versión segura por defecto
  getUsuariosDB: () => mongoDB.getUsuariosDB(),
  getFormulariosDB: () => mongoDB.getFormulariosDB(),
  getMaterialDB: () => mongoDB.getMaterialDB(),
  mongoDB
};