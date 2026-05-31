const pool = require("../config/db");
// para encriptar contraseñas
const bcrypt = require("bcryptjs");
// para los tokens de sesión
const jwt = require("jsonwebtoken");
// para validar lo de google
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// función para crear el token que se manda al cliente
const generateToken = (id, email) => {
    return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: "7d" });
};

exports.register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ success: false, error: "faltan campos" });
        }

        const [existing] = await pool.execute("SELECT id FROM usuarios WHERE email = ?", [email]);
        if (existing.length > 0) return res.status(400).json({ success: false, error: "el email ya existe" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            "INSERT INTO usuarios (nombre, email, password_hash, auth_provider) VALUES (?, ?, ?, \"local\")",
            [nombre, email, hashedPassword]
        );

        const token = generateToken(result.insertId, email);
        res.status(201).json({ success: true, token, user: { id: result.insertId, nombre, email } });
    } catch (err) {
        res.status(500).json({ success: false, error: "error en el registro" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.execute("SELECT * FROM usuarios WHERE email = ? AND auth_provider = \"local\"", [email]);

        if (users.length === 0) return res.status(401).json({ success: false, error: "usuario no encontrado" });

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) return res.status(401).json({ success: false, error: "contraseña incorrecta" });

        const token = generateToken(user.id, user.email);
        res.json({ success: true, token, user: { id: user.id, nombre: user.nombre, email: user.email } });
    } catch (err) {
        res.status(500).json({ success: false, error: "error en el login" });
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

        // miro si el usuario ya existe en mi tabla
        let [users] = await pool.execute("SELECT * FROM usuarios WHERE email = ?", [email]);
        let user;

        if (users.length === 0) {
            // si es nuevo lo guardo
            const [result] = await pool.execute(
                "INSERT INTO usuarios (nombre, email, auth_provider, provider_id) VALUES (?, ?, \"google\", ?)",
                [nombre, email, provider_id]
            );
            user = { id: result.insertId, nombre, email };
        } else {
            user = users[0];
            // si existía pero no tenía el id de google se lo pongo
            if (!user.provider_id) {
                await pool.execute("UPDATE usuarios SET auth_provider = \"google\", provider_id = ? WHERE id = ?", [provider_id, user.id]);
            }
        }

        const jwtToken = generateToken(user.id, user.email);
        res.json({ success: true, token: jwtToken, user: { id: user.id, nombre: user.nombre, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "error en login con google" });
    }
};

exports.updateName = async (req, res) => {
    // actualiza el nombre del usuario
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ success: false, error: "falta el nombre" });

        await pool.execute("UPDATE usuarios SET nombre = ? WHERE id = ?", [nombre, req.user.id]);
        res.json({ success: true, message: "nombre actualizado" });
    } catch (err) {
        console.error("error en updateName:", err);
        res.status(500).json({ success: false, error: "error al actualizar nombre" });
    }
};

exports.deleteAccount = async (req, res) => {
    // elimina al usuario y sus datos
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const usuario_id = req.user.id;

        // 1. quito las canciones que haya subido
        await connection.execute("DELETE FROM canciones WHERE subida_por_usuario_id = ?", [usuario_id]);

        // 2. borro al usuario de la tabla principal
        await connection.execute("DELETE FROM usuarios WHERE id = ?", [usuario_id]);

        await connection.commit();
        res.json({ success: true, message: "cuenta y datos eliminados correctamente" });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error("error en deleteAccount:", err);
        res.status(500).json({ success: false, error: "error al eliminar la cuenta" });
    } finally {
        if (connection) connection.release();
    }
};
