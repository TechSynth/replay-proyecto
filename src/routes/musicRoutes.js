const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { verifyToken } = require('../middlewares/auth');

router.get('/canciones', musicController.getAllSongs);
router.get('/library', verifyToken, musicController.getUserLibrary);
router.post('/analyze', verifyToken, musicController.uploadFields, musicController.analyzeMetadata); // nueva ruta analisis
router.post('/upload', verifyToken, musicController.uploadFields, musicController.uploadSong);
router.get('/usuarios/:userId/playlists', musicController.getUserPlaylists);
router.post('/playlists', verifyToken, musicController.createPlaylist);
router.get('/playlists/:id', verifyToken, musicController.getPlaylist);
router.put('/playlists/:id', verifyToken, musicController.uploadFields, musicController.updatePlaylist);
router.delete('/playlists/:id', verifyToken, musicController.deletePlaylist);
router.post('/playlists/:id/canciones', verifyToken, musicController.addSongToPlaylist);
router.post('/favoritos/:cancionId', verifyToken, musicController.toggleFavorite);
router.get('/search', musicController.search);
router.get('/music/stream/:id', musicController.streamSong);

module.exports = router;
