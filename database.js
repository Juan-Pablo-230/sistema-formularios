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
      
      console.log('🔌 Conectando a MongoDB Atlas...');
      
      if (!uri) {
        throw new Error('MONGODB_URI no está definida en las variables de entorno');
      }

      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      
      // ¡NO especificamos base de datos aquí! Nos conectamos al cluster
      console.log('✅ Conectado a MongoDB Atlas correctamente (raíz del cluster)');
      console.log('📊 Puedes acceder a múltiples bases de datos');
      
      this.isConnected = true;
      return this.client; // Devolvemos el cliente, no una base de datos específica
      
    } catch (error) {
      console.error('❌ Error conectando a MongoDB Atlas:', error.message);
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