require('dotenv').config();
const MigracionController = require('../controls/MigracionController'); // Ajusta la ruta si está en otro lugar

(async () => {
  const migrador = new MigracionController();

  try {
    console.log('🔄 Iniciando migración desde Azure Cosmos DB...');
    await migrador.migrar();
    console.log('✅ Migración finalizada correctamente.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
  } finally {
    process.exit();
  }
})();
