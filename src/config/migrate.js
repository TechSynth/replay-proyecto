const pool = require('./db');

async function runMigrations() {
    try {
        console.log('ejecutando migraciones...');
        
        // permitir password null
        await pool.execute('ALTER TABLE usuarios MODIFY password_hash VARCHAR(255) NULL');
        
        // columnas para login social
        const [columns] = await pool.execute('SHOW COLUMNS FROM usuarios LIKE "auth_provider"');
        if (columns.length === 0) {
            await pool.execute('ALTER TABLE usuarios ADD COLUMN auth_provider VARCHAR(50) DEFAULT "local" AFTER email');
        }
        
        const [columnsId] = await pool.execute('SHOW COLUMNS FROM usuarios LIKE "provider_id"');
        if (columnsId.length === 0) {
            await pool.execute('ALTER TABLE usuarios ADD COLUMN provider_id VARCHAR(255) NULL AFTER auth_provider');
        }
        
        console.log('migraciones finalizadas');
    } catch (err) {
        console.error('error en migraciones:', err.message);
    }
}

module.exports = runMigrations;
