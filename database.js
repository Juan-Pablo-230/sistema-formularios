const { MongoClient, ServerApiVersion } = require('mongodb');

class MongoDB {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

async connect() {
  try {
    const uri = process.env.MONGODB_URI;
    
    console.log('=== MONGODB CONNECTION DEBUG ===');
    console.log('URI defined:', !!uri);
    console.log('URI length:', uri ? uri.length : 0);
    
    // Mostrar URI (enmascarada) para debug
    if (uri) {
      const maskedURI = uri.replace(
        /mongodb\+srv:\/\/[^:]+:[^@]+@/, 
        'mongodb+srv://***:***@'
      );
      console.log('Masked URI:', maskedURI);
    }
    
    if (!uri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }

    console.log('🔌 Intentando conectar a MongoDB Atlas...');
    
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // Reducido para debug
      socketTimeoutMS: 10000,
    });

    console.log('⏳ Conectando...');
    await this.client.connect();
    
    // Verificar conexión con ping
    await this.client.db().admin().command({ ping: 1 });
    
    this.isConnected = true;
    console.log('✅ Conectado a MongoDB Atlas correctamente');
    
    return this.client;
    
  } catch (error) {
    console.error('❌ ERROR conectando a MongoDB Atlas:');
    console.error('- Message:', error.message);
    console.error('- Error code:', error.code);
    console.error('- Error name:', error.name);
    
    // Info adicional sobre el error
    if (error.message.includes('auth failed')) {
      console.error('⚠️ Error de autenticación - Verifica usuario/contraseña');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('⚠️ Error de DNS - Verifica el hostname del cluster');
    } else if (error.message.includes('timed out')) {
      console.error('⚠️ Timeout - Verifica Network Access en MongoDB Atlas');
    }
    
    throw error;
  }
}

  // Método para obtener una base de datos específica
  getDatabase(dbName) {
    if (!this.isConnected) {
      throw new Error('No hay conexión a la base de datos');
    }
    return this.client.db(dbName);
  }

  // Métodos específicos para tus bases de datos
  getUsuariosDB() {
    return this.getDatabase('usuario');
  }

  getFormulariosDB() {
    return this.getDatabase('formulario');
  }

  getMaterialDB() {
    return this.getDatabase('material');
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
  getDB: (dbName) => mongoDB.getDatabase(dbName),
  getUsuariosDB: () => mongoDB.getUsuariosDB(),
  getFormulariosDB: () => mongoDB.getFormulariosDB(),
  getMaterialDB: () => mongoDB.getMaterialDB(),
  mongoDB
};