const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
            'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
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
        const [users] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        
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
    // se completara cuando tengamos las apis
    res.json({ success: false, message: 'google login pendiente de configuracion' });
};

exports.appleLogin = async (req, res) => {
    // se completara cuando tengamos las apis
    res.json({ success: false, message: 'apple login pendiente de configuracion' });
};

exports.getCurrentUser = async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT id, nombre, email, plan FROM usuarios WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: users[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: 'error de sesion' });
    }
};
