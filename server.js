// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

//configuración de conexión a MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

let db;

// Conectar a la base de datos
async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Conexion a la base de datos con exito');
    } catch (error) {
        console.error('Error conectando a la base de datos:', error);
        process.exit(1);
    }
}

// RUTAS DE LA API

// Ruta de inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Obtener todas las canciones
app.get('/api/canciones', async (req, res) => {
    try {
        const [canciones] = await db.execute(`
            SELECT c.*, a.nombre as artista_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE ca.tipo = 'principal'
        `);
        res.json({ success: true, data: canciones });
    } catch (error) {
        console.error('Error obteniendo canciones:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Obtener detalles de una canción específica
app.get('/api/canciones/:id', async (req, res) => {
    try {
        const [canciones] = await db.execute(
            'SELECT * FROM canciones WHERE id = ?',
            [req.params.id]
        );
        
        if (canciones.length === 0) {
            return res.status(404).json({ success: false, error: 'Canción no encontrada' });
        }
        
        res.json({ success: true, data: canciones[0] });
    } catch (error) {
        console.error('Error obteniendo canción:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Obtener todos los artistas
app.get('/api/artistas', async (req, res) => {
    try {
        const [artistas] = await db.execute('SELECT * FROM artistas');
        res.json({ success: true, data: artistas });
    } catch (error) {
        console.error('Error obteniendo artistas:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Obtener playlists de un usuario
app.get('/api/usuarios/:userId/playlists', async (req, res) => {
    try {
        const [playlists] = await db.execute(
            'SELECT * FROM playlists WHERE usuario_id = ?',
            [req.params.userId]
        );
        res.json({ success: true, data: playlists });
    } catch (error) {
        console.error('Error obteniendo playlists:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Crear nueva playlist
app.post('/api/playlists', async (req, res) => {
    try {
        const { nombre, descripcion, usuario_id } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO playlists (nombre, descripcion, usuario_id) VALUES (?, ?, ?)',
            [nombre, descripcion, usuario_id]
        );
        
        res.status(201).json({ 
            success: true, 
            data: { id: result.insertId, nombre, descripcion, usuario_id }
        });
    } catch (error) {
        console.error('Error creando playlist:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Agregar canción a playlist
app.post('/api/playlists/:playlistId/canciones', async (req, res) => {
    try {
        const { cancion_id, orden } = req.body;
        const { playlistId } = req.params;
        
        await db.execute(
            'INSERT INTO playlist_cancion (playlist_id, cancion_id, orden) VALUES (?, ?, ?)',
            [playlistId, cancion_id, orden]
        );
        
        res.status(201).json({ success: true, message: 'Canción agregada a la playlist' });
    } catch (error) {
        console.error('Error agregando canción a playlist:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Búsqueda de canciones
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ success: false, error: 'Parámetro de búsqueda requerido' });
        }
        
        const [canciones] = await db.execute(`
            SELECT c.*, a.nombre as artista_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE c.titulo LIKE ? OR a.nombre LIKE ?
        `, [`%${q}%`, `%${q}%`]);
        
        res.json({ success: true, data: canciones });
    } catch (error) {
        console.error('Error en búsqueda:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// INICIAR SERVIDOR

async function startServer() {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`Servidor rePLAY corriendo en http://localhost:${PORT}`);
    });
}

startServer();
