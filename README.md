# rePLAY

**Live:** [https://replays.studio](https://replays.studio)

Este es mi Proyecto Final de Grado (TFG) para el ciclo de Desarrollo de Aplicaciones Web (DAW II). Básicamente, quería hacerme un clon de Spotify que funcionara de verdad, pero controlando yo dónde y cómo se guardan los archivos.

Me harté rápido de la idea de guardar MP3 en una base de datos local (peta el servidor en minutos), así que terminé montando una infraestructura completa en Amazon Web Services.

## Qué hace

- **La música suena desde S3**: Los archivos de audio y las carátulas no tocan mi servidor de Node. Van directos a un bucket de Amazon S3, y la web hace streaming desde ahí.
- **Lee los metadatos**: Si subes un MP3, el servidor usa `music-metadata` para sacar el título y el artista automáticamente. Me ahorró tener que hacer un formulario gigante.
- **Diseño sin recargas**: Es una Single Page Application (SPA) hecha con Vanilla JS. Si cambias de pestaña, la música sigue sonando.
- **Modo móvil real**: Me tiré semanas peleando con CSS para que en el móvil no se viera como una web de escritorio encogida. Tiene su propia barra inferior y los controles cambian.
- **Login con Google**: Implementé OAuth 2.0 porque a nadie le gusta crear cuentas nuevas hoy en día.

## El Stack

No quise usar React ni frameworks de frontend pesados porque quería demostrar que entiendo cómo funciona el DOM por debajo.

- **Frontend**: HTML5, CSS (bastante Grid y Flexbox) y JavaScript puro.
- **Backend**: Node.js con Express.
- **Base de Datos**: MySQL corriendo en Amazon RDS.
- **Infraestructura**: Amazon EC2 (Ubuntu), Amazon S3, y Nginx haciendo de proxy inverso para gestionar el certificado SSL (Let's Encrypt).

## Estructura de carpetas

Bastante estándar, separando el cliente del servidor:

```
replay-proyecto/
├── src/
│   ├── config/        # Conexión a la BBDD
│   ├── controllers/   # Donde pasa la magia (Auth y Música)
│   ├── routes/        # Los endpoints
│   └── middlewares/   # Comprobación del token JWT
├── public/            # Todo lo que ve el usuario
│   ├── app.js         # El reproductor y la lógica visual
│   ├── auth.js        # El login
│   └── styles.css     # +1500 líneas de CSS
├── database.sql       # Tablas
└── server.js          # Punto de entrada
```

## Para probarlo en local

Necesitas tener Node y MySQL instalados, y una cuenta de AWS activa.

1. Clonas esto.
2. Haces `npm install`.
3. Metes la base de datos `database.sql` en tu MySQL.
4. Creas un `.env` basado en este formato (necesitarás tus propias keys de AWS):
   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=tu_password
   DB_NAME=replay_db
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=tu-bucket
   JWT_SECRET=secreto
   GOOGLE_CLIENT_ID=xxx
   ```
5. `node server.js`

El proyecto me ha servido para aprender que configurar un proxy inverso en Nginx duele más que escribir mil líneas de JavaScript, pero el resultado compensa.
