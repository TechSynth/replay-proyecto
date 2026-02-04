# rePLAY - Music Streaming Platform

A collaborative full-stack music streaming application developed as a final degree project for C.F.G.S DAW II (Higher Education Web Application Development). Built with Node.js, Express, and MySQL, demonstrating modern web development practices including RESTful API design and relational database modeling.

## Tech Stack

- Backend: Node.js, Express.js
- Database: MySQL 8.0
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Icons: Font Awesome
- Planned: AWS S3, AWS EC2, JWT Authentication

## Installation
```bash
npm install
mysql -u root -p < database.sql
node server.js
```

Configure database credentials in `server.js` before running.

Access at `http://localhost:3000`

## Features

- RESTful API with 7 endpoints
- Real-time search functionality
- Playlist management
- Responsive design
- MVC architecture

## API Endpoints
```
GET    /api/canciones
GET    /api/canciones/:id
GET    /api/artistas
GET    /api/usuarios/:userId/playlists
POST   /api/playlists
POST   /api/playlists/:id/canciones
GET    /api/search?q={query}
```

## Project Structure
```
replay-proyecto/
├── server.js          # Express server
├── database.sql       # Database schema
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Development Status

Current: Basic functionality complete
Next: AWS S3 integration, JWT authentication, real audio playback

## Team

Collaborative project for
C.F.G.S DAW II - Web Application Development
