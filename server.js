require("dotenv").config();
const express = require("express");
const path = require("path");
const authRoutes = require("./src/routes/authRoutes");
const musicRoutes = require("./src/routes/musicRoutes");
const runMigrations = require("./src/config/migrate");

// arrancando el motor de express
const app = express();
const PORT = process.env.PORT || 3000;

// ejecuto las migraciones para que las tablas estén listas
runMigrations();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// rutas para el login y esas cosas
app.use("/api/auth", authRoutes);
app.use("/api", musicRoutes);
console.log("rutas de autenticación y música cargadas.");

// rutas para mostrar las páginas
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.listen(PORT, () => {
    console.log(`servidor corriendo en http://localhost:${PORT}`);
});
