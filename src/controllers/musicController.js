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

exports.uploadSong = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        let { titulo, artista, album } = req.body;

        if (!req.files || !req.files['audio']) {
            return res.status(400).json({ success: false, error: 'no se ha subido el archivo de audio' });
        }

        const audioFile = req.files['audio'][0];
        let imageFile = req.files['imagen'] ? req.files['imagen'][0] : null;

        // extraer metadatos del archivo
        const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
        const tags = metadata.common;

        // priorizar metadatos si no se enviaron campos manuales
        titulo = titulo || tags.title || audioFile.originalname.replace(/\.[^/.]+$/, "");
        artista = artista || tags.artist || 'artista desconocido';
        album = album || tags.album || 'sin album';
        const duracion = Math.round(metadata.format.duration || 0);

        // verificar cuota de 3 canciones
        const [countRows] = await pool.execute(
            'SELECT COUNT(*) as total FROM canciones WHERE subida_por_usuario_id = ?',
            [usuario_id]
        );

        if (countRows[0].total >= 3) {
            return res.status(403).json({ success: false, error: 'limite de 3 canciones alcanzado' });
        }

        const bucketName = 'replay-music-tfg';
        const timestamp = Date.now();
        const baseName = slugify(titulo);
        
        // 1. subir audio a s3
        const audioFileName = `uploads/audio/${timestamp}-${baseName}.mp3`;
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: audioFileName,
            Body: audioFile.buffer,
            ContentType: 'audio/mpeg',
            ACL: 'public-read'
        }));
        const audioUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioFileName}`;

        // 2. gestionar imagen (prioridad: subida manual > metadatos)
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
            'INSERT INTO canciones (titulo, duracion, audio_url, imagen_url, subida_por_usuario_id) VALUES (?, ?, ?, ?, ?)',
            [titulo, duracion, audioUrl, imageUrl, usuario_id]
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

        console.log(`cancion subida y procesada: ${titulo}`);
        res.json({ success: true, data: { id: cancionId, titulo, artista, album, imageUrl } });
    } catch (err) {
        console.error('error en subida:', err);
        res.status(500).json({ success: false, error: 'error al procesar la subida' });
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
