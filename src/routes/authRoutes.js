const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/me', verifyToken, authController.getCurrentUser);
router.put('/profile-name', verifyToken, authController.updateName);
router.delete('/profile', verifyToken, authController.deleteAccount);

module.exports = router;
