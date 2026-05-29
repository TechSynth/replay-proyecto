const pool = require('../config/db');
// documentacion bcrypt: https://github.com/kelektiv/node.bcrypt.js
const bcrypt = require('bcryptjs');
// documentacion jwt: https://jwt.io/
const jwt = require('jsonwebtoken');

// documentacion verificacion google: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const generateToken = (id, email) => {
    return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, error: 'faltan campos' });
        }

        const [existing] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ success: false, error: 'el email ya existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nombre, email, password_hash, auth_provider) VALUES (?, ?, ?, "local")',
            [nombre, email, hashedPassword]
        );

        const token = generateToken(result.insertId, email);
        res.status(201).json({ success: true, token, user: { id: result.insertId, nombre, email } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error en el registro' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.execute('SELECT * FROM usuarios WHERE email = ? AND auth_provider = "local"', [email]);
        
        if (users.length === 0) return res.status(401).json({ success: false, error: 'usuario no encontrado' });

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ success: false, error: 'contraseña incorrecta' });

        const token = generateToken(user.id, user.email);
        res.json({ success: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error en el login' });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: provider_id, email, name: nombre } = payload;

        // buscar si existe
        let [users] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        let user;

        if (users.length === 0) {
            // nuevo usuario
            const [result] = await pool.execute(
                'INSERT INTO usuarios (nombre, email, auth_provider, provider_id) VALUES (?, ?, "google", ?)',
                [nombre, email, provider_id]
            );
            user = { id: result.insertId, nombre, email };
        } else {
            user = users[0];
            // actualizar id si falta
            if (!user.provider_id) {
                await pool.execute('UPDATE usuarios SET auth_provider = "google", provider_id = ? WHERE id = ?', [provider_id, user.id]);
            }
        }

        const jwtToken = generateToken(user.id, user.email);
        res.json({ success: true, token: jwtToken, user: { id: user.id, nombre: user.nombre, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'error en login con google' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, nombre, email, plan FROM usuarios WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: users[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error de sesion' });
    }
};

exports.updateName = async (req, res) => {
    console.log('Petición recibida: updateName para ID', req.user.id);
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ success: false, error: 'falta el nombre' });

        await pool.execute('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, req.user.id]);
        res.json({ success: true, message: 'nombre actualizado' });
    } catch (err) {
        console.error('Error en updateName:', err);
        res.status(500).json({ success: false, error: 'error al actualizar nombre' });
    }
};

exports.deleteAccount = async (req, res) => {
    console.log('Petición recibida: deleteAccount para ID', req.user.id);
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const usuario_id = req.user.id;

        // 1. Borrar canciones subidas por el usuario (el esquema tiene SET NULL por defecto)
        await connection.execute('DELETE FROM canciones WHERE subida_por_usuario_id = ?', [usuario_id]);

        // 2. Borrar el usuario (esto disparará cascadas en playlists, historial, favoritos)
        await connection.execute('DELETE FROM usuarios WHERE id = ?', [usuario_id]);

        await connection.commit();
        console.log('Usuario eliminado correctamente:', usuario_id);
        res.json({ success: true, message: 'cuenta y datos eliminados correctamente' });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error en deleteAccount:', err);
        res.status(500).json({ success: false, error: 'error al eliminar la cuenta' });
    } finally {
        if (connection) connection.release();
    }
};
