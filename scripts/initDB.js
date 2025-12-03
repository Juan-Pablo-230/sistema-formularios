const { connectToDatabase, getDB } = require('../database');

async function initializeDatabase() {
    try {
        console.log('🚀 Inicializando base de datos...');
        await connectToDatabase();
        const db = getDB();

        // Clases por defecto (opcional, si necesitas clases predefinidas)
        const clases = [
            {
                nombre: "Aislamientos y casos clínicos",
                descripcion: "Lic. Romina Seminario, Lic. Mirta Díaz",
                fechaClase: new Date('2025-12-04'),
                fechaCierre: new Date('2025-12-04T10:00:00'),
                activa: true,
                instructores: ["Lic. Romina Seminario", "Lic. Mirta Díaz"]
            }

        ];

        // Solo crear clases si no existen
        for (const clase of clases) {
            const claseExistente = await db.collection('clases').findOne({ nombre: clase.nombre });
            if (!claseExistente) {
                await db.collection('clases').insertOne(clase);
                console.log(`✅ Clase creada: ${clase.nombre}`);
            } else {
                console.log(`✅ Clase ya existe: ${clase.nombre}`);
            }
        }

        // Verificar/crear colección de material
        const collections = await db.listCollections({ name: 'material' }).toArray();
        const materialCollectionExists = collections.some(col => col.name === 'material');
        
        if (!materialCollectionExists) {
            console.log('📝 Creando colección "material"...');
            await db.createCollection('material');
            
            await db.collection('material').createIndex({ usuarioId: 1, clase: 1 });
            await db.collection('material').createIndex({ fechaSolicitud: -1 });
            await db.collection('material').createIndex({ clase: 1 });
            
            console.log('✅ Colección "material" creada exitosamente con índices');
        } else {
            console.log('✅ Colección "material" ya existe');
        }

        console.log('🎉 Base de datos inicializada correctamente!');
        console.log('\n📊 Colecciones creadas/verificadas:');
        console.log('   - usuarios (con índices únicos para legajo y email)');
        console.log('   - inscripciones (con índice único para usuarioId + clase)');
        console.log('   - material (con índices para búsquedas eficientes)');
        console.log('   - clases (clases predefinidas)');
        console.log('\n🔧 Los usuarios deben registrarse desde la aplicación web');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    }
}

initializeDatabase();