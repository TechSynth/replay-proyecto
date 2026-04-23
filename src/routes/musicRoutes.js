const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { verifyToken } = require('../middlewares/auth');

// Canciones
router.get('/canciones', musicController.getAllSongs);
router.get('/search', musicController.search);

// Playlists
router.get('/usuarios/:userId/playlists', musicController.getUserPlaylists);
router.post('/playlists', verifyToken, musicController.createPlaylist);
router.delete('/playlists/:playlistId', verifyToken, musicController.deletePlaylist);

// Canciones en Playlists
router.get('/playlists/:playlistId/canciones', musicController.getPlaylistSongs);
router.post('/playlists/:playlistId/canciones', verifyToken, musicController.addSongToPlaylist);
router.delete('/playlists/:playlistId/canciones/:cancionId', verifyToken, musicController.removeSongFromPlaylist);

module.exports = router;
