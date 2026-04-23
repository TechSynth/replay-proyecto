const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/apple', authController.appleLogin);
router.get('/user', verifyToken, authController.getCurrentUser);

module.exports = router;
