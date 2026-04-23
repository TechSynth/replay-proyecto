// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura';

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

// Middleware para verificar token JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Token requerido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Token inválido' });
    }
}

// RUTAS DE LA API

// Ruta de inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// AUTENTICACIÓN

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Validar datos
        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
        }
        
        // Verificar si el email ya existe
        const [existingUser] = await db.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, error: 'El email ya está registrado' });
        }
        
        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Crear usuario
        const [result] = await db.execute(
            'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        
        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            success: true,
            token,
            user: { id: userId, nombre, email }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, error: 'Error en el registro' });
    }
});

// Login de usuario
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validar datos
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
        }
        
        // Buscar usuario
        const [users] = await db.execute(
            'SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
        }
        
        const user = users[0];
        
        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Email o contraseña incorrectos' });
        }
        
        // Actualizar última conexión
        await db.execute(
            'UPDATE usuarios SET ultima_conexion = NOW() WHERE id = ?',
            [user.id]
        );
        
        // Crear token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error en el login' });
    }
});

// Obtener información del usuario actual
app.get('/api/auth/user', verifyToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, nombre, email, plan FROM usuarios WHERE id = ?',
            [req.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        
        res.json({ success: true, user: users[0] });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
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
