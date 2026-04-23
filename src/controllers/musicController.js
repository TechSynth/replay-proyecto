const pool = require('../config/db');

exports.getAllSongs = async (req, res) => {
    try {
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE ca.tipo = 'principal'
        `);
        res.json({ success: true, data: songs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar canciones' });
    }
};

exports.getUserPlaylists = async (req, res) => {
    try {
        const [playlists] = await pool.execute('SELECT * FROM playlists WHERE usuario_id = ?', [req.params.userId]);
        res.json({ success: true, data: playlists });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar playlists' });
    }
};

exports.search = async (req, res) => {
    try {
        const { q } = req.query;
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE c.titulo LIKE ? OR a.nombre LIKE ?
        `, [`%${q}%`, `%${q}%`]);
        res.json({ success: true, data: songs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error en la busqueda' });
    }
};

// Crear una nueva playlist
exports.createPlaylist = async (req, res) => {
    try {
        const { nombre, descripcion, es_publica } = req.body;
        const usuario_id = req.user.id; // Desde token JWT

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, error: 'El nombre de la playlist es requerido' });
        }

        const [result] = await pool.execute(
            'INSERT INTO playlists (nombre, descripcion, usuario_id, es_publica) VALUES (?, ?, ?, ?)',
            [nombre, descripcion || null, usuario_id, es_publica || false]
        );

        res.status(201).json({ 
            success: true, 
            data: {
                id: result.insertId,
                nombre,
                descripcion: descripcion || null,
                usuario_id,
                es_publica: es_publica || false
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al crear la playlist' });
    }
};

// Agregar canción a playlist
exports.addSongToPlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { cancion_id } = req.body;
        const usuario_id = req.user.id;

        // Verificar que la playlist pertenece al usuario
        const [playlists] = await pool.execute(
            'SELECT id FROM playlists WHERE id = ? AND usuario_id = ?',
            [playlistId, usuario_id]
        );

        if (playlists.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta playlist' });
        }

        // Obtener el máximo orden actual
        const [maxOrden] = await pool.execute(
            'SELECT MAX(orden) as max_orden FROM playlist_cancion WHERE playlist_id = ?',
            [playlistId]
        );

        const orden = (maxOrden[0]?.max_orden || 0) + 1;

        await pool.execute(
            'INSERT INTO playlist_cancion (playlist_id, cancion_id, orden) VALUES (?, ?, ?)',
            [playlistId, cancion_id, orden]
        );

        res.json({ success: true, message: 'Canción agregada a la playlist' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al agregar canción a la playlist' });
    }
};

// Eliminar canción de playlist
exports.removeSongFromPlaylist = async (req, res) => {
    try {
        const { playlistId, cancionId } = req.params;
        const usuario_id = req.user.id;

        // Verificar que la playlist pertenece al usuario
        const [playlists] = await pool.execute(
            'SELECT id FROM playlists WHERE id = ? AND usuario_id = ?',
            [playlistId, usuario_id]
        );

        if (playlists.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para modificar esta playlist' });
        }

        await pool.execute(
            'DELETE FROM playlist_cancion WHERE playlist_id = ? AND cancion_id = ?',
            [playlistId, cancionId]
        );

        res.json({ success: true, message: 'Canción eliminada de la playlist' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al eliminar canción de la playlist' });
    }
};

// Eliminar playlist
exports.deletePlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const usuario_id = req.user.id;

        // Verificar que la playlist pertenece al usuario
        const [playlists] = await pool.execute(
            'SELECT id FROM playlists WHERE id = ? AND usuario_id = ?',
            [playlistId, usuario_id]
        );

        if (playlists.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes permiso para eliminar esta playlist' });
        }

        await pool.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);

        res.json({ success: true, message: 'Playlist eliminada' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al eliminar la playlist' });
    }
};

// Obtener canciones de una playlist
exports.getPlaylistSongs = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre, pc.orden
            FROM playlist_cancion pc
            JOIN canciones c ON pc.cancion_id = c.id
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE pc.playlist_id = ? AND ca.tipo = 'principal'
            ORDER BY pc.orden
        `, [playlistId]);

        res.json({ success: true, data: songs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error al cargar las canciones de la playlist' });
    }
};
