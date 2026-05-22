const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

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

exports.createPlaylist = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const usuario_id = req.user.id;
        const [result] = await pool.execute(
            'INSERT INTO playlists (nombre, descripcion, usuario_id) VALUES (?, ?, ?)',
            [nombre, descripcion, usuario_id]
        );
        res.json({ success: true, data: { id: result.insertId, nombre, descripcion } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al crear playlist' });
    }
};

exports.addSongToPlaylist = async (req, res) => {
    try {
        const { id: playlist_id } = req.params;
        const { cancion_id } = req.body;
        
        // obtener orden
        const [rows] = await pool.execute('SELECT MAX(orden) as max_orden FROM playlist_cancion WHERE playlist_id = ?', [playlist_id]);
        const orden = (rows[0].max_orden || 0) + 1;

        await pool.execute(
            'INSERT INTO playlist_cancion (playlist_id, cancion_id, orden) VALUES (?, ?, ?)',
            [playlist_id, cancion_id, orden]
        );
        res.json({ success: true, message: 'cancion añadida' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al añadir cancion' });
    }
};

exports.toggleFavorite = async (req, res) => {
    try {
        const { cancionId } = req.params;
        const usuario_id = req.user.id;

        const [exists] = await pool.execute('SELECT * FROM favoritos WHERE usuario_id = ? AND cancion_id = ?', [usuario_id, cancionId]);

        if (exists.length > 0) {
            await pool.execute('DELETE FROM favoritos WHERE usuario_id = ? AND cancion_id = ?', [usuario_id, cancionId]);
            res.json({ success: true, liked: false });
        } else {
            await pool.execute('INSERT INTO favoritos (usuario_id, cancion_id) VALUES (?, ?)', [usuario_id, cancionId]);
            res.json({ success: true, liked: true });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: 'error en favoritos' });
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
exports.streamSong = async (req, res) => {
    try {
        const { id } = req.params;
        const [songs] = await pool.execute('SELECT audio_url FROM canciones WHERE id = ?', [id]);

        if (songs.length === 0) return res.status(404).send('no encontrado');

        const song = songs[0];

        // si es una url de s3 (empieza por http), redirigir directamente
        if (song.audio_url.startsWith('http')) {
            return res.redirect(song.audio_url);
        }

        // si es local, buscar en la carpeta public
        const musicPath = path.join(__dirname, '../../public', song.audio_url);

        if (!fs.existsSync(musicPath)) return res.status(404).send('archivo no encontrado');

        const stat = fs.statSync(musicPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(musicPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'audio/mpeg',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'audio/mpeg',
            };
            res.writeHead(200, head);
            fs.createReadStream(musicPath).pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('error de streaming');
    }
};
