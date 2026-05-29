const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mm = require('music-metadata');

// configuracion s3 (v3)
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
    }
});

const storage = multer.memoryStorage();
exports.upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10mb limite
});

// middleware para multiples campos
exports.uploadFields = exports.upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'imagen', maxCount: 1 }
]);

// funcion para limpiar nombres de archivos
const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// funcion para analizar metadatos sin guardar nada
exports.analyzeMetadata = async (req, res) => {
    try {
        if (!req.files || !req.files['audio']) {
            return res.status(400).json({ success: false, error: 'no hay archivo' });
        }

        const audioFile = req.files['audio'][0];
        const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
        const tags = metadata.common;

        res.json({
            success: true,
            data: {
                titulo: tags.title || '',
                artista: tags.artist || '',
                album: tags.album || '',
                genero: (tags.genre && tags.genre.length > 0) ? tags.genre[0] : '',
                duracion: Math.round(metadata.format.duration || 0),
                has_picture: !!(tags.picture && tags.picture.length > 0)
            }
        });
    } catch (err) {
        console.error('error analizando archivo:', err);
        res.status(500).json({ success: false, error: 'no se pudo analizar el archivo' });
    }
};

exports.uploadSong = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const { titulo, artista, album, genero } = req.body;

        if (!req.files || !req.files['audio']) {
            return res.status(400).json({ success: false, error: 'falta el archivo de audio' });
        }

        const audioFile = req.files['audio'][0];
        const imageFile = req.files['imagen'] ? req.files['imagen'][0] : null;

        // verificar cuota
        const [countRows] = await pool.execute(
            'SELECT COUNT(*) as total FROM canciones WHERE subida_por_usuario_id = ?',
            [usuario_id]
        );

        if (countRows[0].total >= 3) {
            return res.status(403).json({ success: false, error: 'límite alcanzado' });
        }

        // extraer duracion real si no viene
        const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
        const duracion = Math.round(metadata.format.duration || 0);
        const tags = metadata.common;

        const bucketName = 'replay-music-tfg';
        const timestamp = Date.now();
        const baseName = slugify(titulo || 'cancion');
        
        // 1. subir audio
        const audioFileName = `uploads/audio/${timestamp}-${baseName}.mp3`;
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: audioFileName,
            Body: audioFile.buffer,
            ContentType: 'audio/mpeg',
            ACL: 'public-read'
        }));
        const audioUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioFileName}`;

        // 2. gestionar imagen (prioridad: manual > metadatos)
        let imageUrl = null;
        let imageBuffer = null;
        let imageType = 'image/jpeg';

        if (imageFile) {
            imageBuffer = imageFile.buffer;
            imageType = imageFile.mimetype;
        } else if (tags.picture && tags.picture.length > 0) {
            imageBuffer = tags.picture[0].data;
            imageType = tags.picture[0].format;
        }

        if (imageBuffer) {
            const imageFileName = `uploads/images/${timestamp}-${baseName}.jpg`;
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: imageFileName,
                Body: imageBuffer,
                ContentType: imageType,
                ACL: 'public-read'
            }));
            imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageFileName}`;
        }

        // 3. guardar en bd
        const [result] = await pool.execute(
            'INSERT INTO canciones (titulo, duracion, audio_url, imagen_url, subida_por_usuario_id, genero) VALUES (?, ?, ?, ?, ?, ?)',
            [titulo, duracion, audioUrl, imageUrl, usuario_id, genero || 'desconocido']
        );
        const cancionId = result.insertId;

        // vincular artista
        const [artistas] = await pool.execute('SELECT id FROM artistas WHERE nombre = ?', [artista]);
        let artistaId;
        if (artistas.length === 0) {
            const [newArt] = await pool.execute('INSERT INTO artistas (nombre) VALUES (?)', [artista]);
            artistaId = newArt.insertId;
        } else {
            artistaId = artistas[0].id;
        }
        await pool.execute('INSERT INTO cancion_artista (cancion_id, artista_id, tipo) VALUES (?, ?, ?)', [cancionId, artistaId, 'principal']);

        // vincular album
        const [albums] = await pool.execute('SELECT id FROM albums WHERE titulo = ?', [album]);
        let albumId;
        if (albums.length === 0) {
            const [newAlb] = await pool.execute('INSERT INTO albums (titulo, caratula_url) VALUES (?, ?)', [album, imageUrl]);
            albumId = newAlb.insertId;
        } else {
            albumId = albums[0].id;
        }
        await pool.execute('INSERT INTO cancion_album (cancion_id, album_id) VALUES (?, ?)', [cancionId, albumId]);

        res.json({ success: true, data: { id: cancionId, titulo } });
    } catch (err) {
        console.error('error en subida final:', err);
        res.status(500).json({ success: false, error: 'error al guardar la canción' });
    }
};

exports.getUserLibrary = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre, alb.titulo as album_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            LEFT JOIN cancion_album calb ON c.id = calb.cancion_id
            LEFT JOIN albums alb ON calb.album_id = alb.id
            WHERE c.subida_por_usuario_id = ?
            ORDER BY c.fecha_subida DESC
        `, [usuario_id]);
        
        res.json({ success: true, data: songs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar biblioteca' });
    }
};

exports.getAllSongs = async (req, res) => {
    try {
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre, alb.titulo as album_nombre
            FROM canciones c
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            LEFT JOIN cancion_album calb ON c.id = calb.cancion_id
            LEFT JOIN albums alb ON calb.album_id = alb.id
            ORDER BY c.id DESC
        `);
        res.json({ success: true, data: songs });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar canciones' });
    }
};

exports.getUserPlaylists = async (req, res) => {
    try {
        const [playlists] = await pool.execute('SELECT * FROM playlists WHERE usuario_id = ? ORDER BY fecha_creacion DESC', [req.params.userId]);
        res.json({ success: true, data: playlists });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar playlists' });
    }
};

exports.getPlaylist = async (req, res) => {
    try {
        const [playlist] = await pool.execute('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
        if (playlist.length === 0) return res.status(404).json({ success: false, error: 'playlist no encontrada' });
        
        const [songs] = await pool.execute(`
            SELECT c.*, a.nombre as artista_nombre, pc.orden
            FROM canciones c
            JOIN playlist_cancion pc ON c.id = pc.cancion_id
            LEFT JOIN cancion_artista ca ON c.id = ca.cancion_id
            LEFT JOIN artistas a ON ca.artista_id = a.id
            WHERE pc.playlist_id = ?
            ORDER BY pc.orden ASC
        `, [req.params.id]);

        res.json({ success: true, data: { ...playlist[0], canciones: songs } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al cargar detalles de playlist' });
    }
};

exports.createPlaylist = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const usuario_id = req.user.id;
        
        // 1. incrementar contador del usuario
        await connection.execute(
            'UPDATE usuarios SET total_playlists_creadas = total_playlists_creadas + 1 WHERE id = ?',
            [usuario_id]
        );

        // 2. obtener nuevo numero
        const [userRows] = await connection.execute(
            'SELECT total_playlists_creadas FROM usuarios WHERE id = ?',
            [usuario_id]
        );
        const numero = userRows[0].total_playlists_creadas;
        const nombre = `Playlist número ${numero}`;

        // 3. crear playlist
        const [result] = await connection.execute(
            'INSERT INTO playlists (nombre, usuario_id) VALUES (?, ?)',
            [nombre, usuario_id]
        );

        await connection.commit();
        res.json({ success: true, data: { id: result.insertId, nombre } });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ success: false, error: 'error al crear playlist' });
    } finally {
        if (connection) connection.release();
    }
};

exports.updatePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const imageFile = req.files && req.files['imagen'] ? req.files['imagen'][0] : null;
        
        let imageUrl = null;
        if (imageFile) {
            const bucketName = 'replay-music-tfg';
            const timestamp = Date.now();
            const fileName = `playlists/images/${timestamp}-${id}.jpg`;
            
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: imageFile.buffer,
                ContentType: imageFile.mimetype,
                ACL: 'public-read'
            }));
            imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        }

        let query = 'UPDATE playlists SET ';
        const params = [];
        if (nombre) {
            query += 'nombre = ?, ';
            params.push(nombre);
        }
        if (imageUrl) {
            query += 'imagen_url = ?, ';
            params.push(imageUrl);
        }
        
        // quitar ultima coma
        query = query.slice(0, -2);
        query += ' WHERE id = ? AND usuario_id = ?';
        params.push(id, req.user.id);

        if (params.length > 2) {
            await pool.execute(query, params);
        }

        res.json({ success: true, data: { id, nombre, imagen_url: imageUrl } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'error al actualizar playlist' });
    }
};

exports.deletePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.user.id;

        const [result] = await pool.execute(
            'DELETE FROM playlists WHERE id = ? AND usuario_id = ?',
            [id, usuario_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'no encontrada o no autorizada' });
        }

        res.json({ success: true, message: 'playlist eliminada' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error al eliminar playlist' });
    }
};

exports.addSongToPlaylist = async (req, res) => {
    try {
        const { id: playlist_id } = req.params;
        const { cancion_id } = req.body;
        
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

        if (song.audio_url.startsWith('http')) {
            return res.redirect(song.audio_url);
        }

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
