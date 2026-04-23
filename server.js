require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const musicRoutes = require('./src/routes/musicRoutes');
const runMigrations = require('./src/config/migrate');

const app = express();
const PORT = process.env.PORT || 3000;

// inicializar bd
runMigrations();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// rutas
app.use('/api/auth', authRoutes);
app.use('/api', musicRoutes);

// front
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`servidor corriendo en http://localhost:${PORT}`);
});
