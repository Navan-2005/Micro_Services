const ridemodel=require('../models/ride.model');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const blacklisttokenmodel=require('../models/blacklist.model')
const {subscribeToQueue,publishToQueue} =require('../service/rabbit')

module.exports.createride=async (req,res)=>{
    try {
        const {pickup,destination}=req.body;
        const newride=new ridemodel({
            user:req.user._id,
            pickup,
            destination});
        console.log(newride);
        console.log('Pick and Destination',pickup,destination);
        
        await newride.save();
        
        await publishToQueue('new-ride',JSON.stringify(newride));
        console.log("Ride sent from ride service");
        
        res.send(newride);
    } catch (error) {
        console.error('Error creating ride:', error);
        res.status(500).json({ message: error.message });
    }
}

module.exports.acceptride = async (req, res, next) => {
    const { rideId } = req.params;
    const ride = await ridemodel.findById(rideId);
    if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
    }

    ride.status = 'accepted';
    await ride.save();
    publishToQueue("ride-accepted", JSON.stringify(ride))
    res.send(ride);
}