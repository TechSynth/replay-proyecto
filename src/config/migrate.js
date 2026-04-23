const pool = require('./db');

async function runMigrations() {
    try {
        console.log('ejecutando migraciones...');
        
        // permitir password null para usuarios de google/apple
        await pool.execute('ALTER TABLE usuarios MODIFY password_hash VARCHAR(255) NULL');
        
        // añadir columnas para ids sociales si no existen
        const [columns] = await pool.execute('SHOW COLUMNS FROM usuarios LIKE "google_id"');
        if (columns.length === 0) {
            await pool.execute('ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER email');
        }
        
        const [columnsApple] = await pool.execute('SHOW COLUMNS FROM usuarios LIKE "apple_id"');
        if (columnsApple.length === 0) {
            await pool.execute('ALTER TABLE usuarios ADD COLUMN apple_id VARCHAR(255) UNIQUE AFTER google_id');
        }
        
        console.log('migraciones finalizadas');
    } catch (err) {
        console.error('error en migraciones:', err.message);
    }
}

module.exports = runMigrations;
