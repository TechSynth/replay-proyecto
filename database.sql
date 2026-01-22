CREATE DATABASE IF NOT EXISTS replay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE replay_db;

--Usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_conexion TIMESTAMP NULL,
    plan VARCHAR(50) DEFAULT 'gratuito',
    INDEX idx_email (email)
) ENGINE=InnoDB;

--Artistas
CREATE TABLE artistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    biografia TEXT,
    imagen_url VARCHAR(500),
    pais VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB;

--Álbumes
CREATE TABLE albums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    anio_lanzamiento YEAR,
    caratula_url VARCHAR(500),
    tipo ENUM('album', 'single', 'ep') DEFAULT 'album',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_titulo (titulo)
) ENGINE=InnoDB;

--Canciones
CREATE TABLE canciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    duracion INT NOT NULL COMMENT 'Duración en segundos',
    audio_url VARCHAR(500) NOT NULL COMMENT 'URL del archivo en S3',
    numero_reproducciones INT DEFAULT 0,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    genero VARCHAR(100),
    letra TEXT,
    INDEX idx_titulo (titulo),
    INDEX idx_genero (genero)
) ENGINE=InnoDB;

--relación Canción-Artista
CREATE TABLE cancion_artista (
    cancion_id INT NOT NULL,
    artista_id INT NOT NULL,
    orden INT DEFAULT 1 COMMENT 'Orden de aparición (artista principal, feat, etc)',
    tipo ENUM('principal', 'featuring', 'productor') DEFAULT 'principal',
    PRIMARY KEY (cancion_id, artista_id),
    FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE,
    FOREIGN KEY (artista_id) REFERENCES artistas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

--relación Canción-Álbum
CREATE TABLE cancion_album (
    cancion_id INT NOT NULL,
    album_id INT NOT NULL,
    numero_pista INT,
    PRIMARY KEY (cancion_id, album_id),
    FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
) ENGINE=InnoDB;

--Playlists
CREATE TABLE playlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    usuario_id INT NOT NULL,
    es_publica BOOLEAN DEFAULT FALSE,
    imagen_url VARCHAR(500),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

--relación Playlist-Canción
CREATE TABLE playlist_cancion (
    playlist_id INT NOT NULL,
    cancion_id INT NOT NULL,
    orden INT NOT NULL,
    fecha_agregada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, cancion_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

--Historial de Reproducción
CREATE TABLE historial_reproducciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    cancion_id INT NOT NULL,
    fecha_reproduccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tiempo_escuchado INT COMMENT 'Segundos escuchados',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE,
    INDEX idx_usuario_fecha (usuario_id, fecha_reproduccion)
) ENGINE=InnoDB;

--Favoritos de Usuario
CREATE TABLE favoritos (
    usuario_id INT NOT NULL,
    cancion_id INT NOT NULL,
    fecha_agregada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, cancion_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- DATA

--usuarios de prueba
INSERT INTO usuarios (nombre, email, password_hash, plan) VALUES
('Ayman Lemrabet', 'ayman@replay.com', '$2b$10$example_hash_1', 'premium'),
('Andrés Cepeda', 'andres@replay.com', '$2b$10$example_hash_2', 'gratuito'),
('Ismail Boudguigue', 'ismail@replay.com', '$2b$10$example_hash_3', 'premium');

--artistas de ejemplo
INSERT INTO artistas (nombre, biografia, pais) VALUES
('The Digital Waves', 'Banda de música electrónica experimental', 'España'),
('Luna Acústica', 'Cantautora de folk contemporáneo', 'Argentina'),
('Bass Revolution', 'Productores de música urbana', 'Colombia');

--álbumes de ejemplo
INSERT INTO albums (titulo, anio_lanzamiento, tipo) VALUES
('Primeras Ondas', 2024, 'album'),
('Canciones de Medianoche', 2023, 'album'),
('Urban Beats Vol.1', 2024, 'ep');

--canciones de ejemplo URLs falsas
INSERT INTO canciones (titulo, duracion, audio_url, genero) VALUES
('Amanecer Digital', 245, 's3://replay-bucket/songs/amanecer_digital.mp3', 'Electrónica'),
('Susurros Nocturnos', 198, 's3://replay-bucket/songs/susurros_nocturnos.mp3', 'Folk'),
('Ritmo Urbano', 210, 's3://replay-bucket/songs/ritmo_urbano.mp3', 'Urbano'),
('Ecos del Pasado', 267, 's3://replay-bucket/songs/ecos_pasado.mp3', 'Electrónica'),
('Caminos de Luna', 223, 's3://replay-bucket/songs/caminos_luna.mp3', 'Folk');

-- relacion canciones con artistas
INSERT INTO cancion_artista (cancion_id, artista_id, tipo) VALUES
(1, 1, 'principal'),
(2, 2, 'principal'),
(3, 3, 'principal'),
(4, 1, 'principal'),
(5, 2, 'principal');

-- relacion canciones con álbumes
INSERT INTO cancion_album (cancion_id, album_id, numero_pista) VALUES
(1, 1, 1),
(4, 1, 2),
(2, 2, 1),
(5, 2, 2),
(3, 3, 1);

--playlist de ejemplo
INSERT INTO playlists (nombre, descripcion, usuario_id, es_publica) VALUES
('Mi Playlist de Trabajo', 'Música para concentrarse', 1, TRUE),
('Favoritas Nocturnas', 'Para las noches tranquilas', 2, FALSE);

-- inserrtar canciones a playlists
INSERT INTO playlist_cancion (playlist_id, cancion_id, orden) VALUES
(1, 1, 1),
(1, 4, 2),
(2, 2, 1),
(2, 5, 2);
