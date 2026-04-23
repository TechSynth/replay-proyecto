const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { verifyToken } = require('../middlewares/auth');

router.get('/canciones', musicController.getAllSongs);
router.get('/usuarios/:userId/playlists', musicController.getUserPlaylists);
router.get('/search', musicController.search);

module.exports = router;
