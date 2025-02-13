const express = require('express');
const router = express.Router();
const userController = require('../controllers/ride.controller');
const authMiddleWare = require('../middlewear/authMiddleWare');

// router.post('/register', userController.register);
// router.post('/login', userController.login);	
// router.get('/logout',userController.logout);
router.post('/createride',authMiddleWare.userAuth,userController.createride);
router.put('/acceptride',authMiddleWare.captainAuth,userController.acceptride);



module.exports = router;