const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  console.log('=== TEST CONNECTION ===');
  console.log('URI length:', uri ? uri.length : 'UNDEFINED');
  
  if (!uri) {
    console.error('❌ MONGODB_URI no está definida');
    return;
  }
  
  // Mostrar URI enmascarada
  const parts = uri.split('@');
  if (parts.length > 1) {
    console.log('Connecting to: mongodb+srv://***:***@' + parts[1]);
  }
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  
  try {
    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    // Hacer ping
    await client.db().admin().command({ ping: 1 });
    console.log('✅ Ping successful');
    
    // Listar bases de datos
    const dbs = await client.db().admin().listDatabases();
    console.log('📊 Databases found:', dbs.databases.map(db => db.name));
    
    await client.close();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('- Error:', error.message);
    console.error('- Code:', error.code);
    console.error('- Name:', error.name);
    
    // Análisis del error
    if (error.message.includes('querySrv')) {
      console.error('⚠️ DNS SRV record error - check cluster URL');
    }
    if (error.message.includes('authentication')) {
      console.error('⚠️ Authentication error - check username/password');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.error('⚠️ Network error - cluster hostname not found');
    }
  }
}

testConnection();