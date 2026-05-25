const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { verifyToken } = require('../middlewares/auth');

router.get('/canciones', musicController.getAllSongs);
router.get('/library', verifyToken, musicController.getUserLibrary); // nueva ruta biblioteca
router.post('/upload', verifyToken, musicController.uploadFields, musicController.uploadSong);
router.get('/usuarios/:userId/playlists', musicController.getUserPlaylists);
router.post('/playlists', verifyToken, musicController.createPlaylist);
router.post('/playlists/:id/canciones', verifyToken, musicController.addSongToPlaylist);
router.post('/favoritos/:cancionId', verifyToken, musicController.toggleFavorite);
router.get('/search', musicController.search);
router.get('/music/stream/:id', musicController.streamSong);

module.exports = router;
