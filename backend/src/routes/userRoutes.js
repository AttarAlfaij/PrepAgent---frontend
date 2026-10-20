const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All user routes require authentication

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

module.exports = router;
