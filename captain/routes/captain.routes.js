const express = require('express');
const router = express.Router();
const userController = require('../controllers/captain.controller');
const authMiddleWare = require('../middlewear/authMiddleWare');

router.post('/register', userController.register);
router.post('/login', userController.login);	
router.get('/logout',userController.logout);
router.get('/profile',authMiddleWare.userAuth,userController.profile);
router.patch('/toggle',authMiddleWare.userAuth,userController.toggle);
router.get('/newride',authMiddleWare.userAuth,userController.waitForNewRide);

module.exports = router;