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
