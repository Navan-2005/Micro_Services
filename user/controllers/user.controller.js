const usermodel=require('../models/usermodel');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const blacklisttokenmodel=require('../models/blacklist.model')
const {subscribeToQueue,publishToQueue} =require('../service/rabbit')


const EventEmitter = require('events');
const rideEventEmitter = new EventEmitter();

module.exports.register=async (req,res)=>{
    try{
        console.log(req.body);	
        
        const {name,email,password}=req.body;
        const user=await usermodel.findOne({email});
        if(user){
            return res.status(400).json({message:'User already exists'});
        }
        const hashedPassword=await bcrypt.hash(password,10);
        const newUser=new usermodel({name,email,password:hashedPassword});
        await newUser.save();

        const token=jwt.sign({id:newUser._id},process.env.JWT_SECRET,{ expiresIn: '1h' });

        res.cookie('token',token);

        delete newUser._doc.password;        
        res.status(201).send({newUser,token});
    }
    catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.login=async (req,res)=>{
    try{
        const {email,password}=req.body;
        const user=await usermodel.findOne({email}).select('+password');	
        if(!user){
            return res.status(400).json({message:'User does not exist'});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:'Incorrect password'});
        }
        const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{ expiresIn: '1h' });
        res.cookie('token',token);
        delete user._doc.password;
        res.status(200).send({user,token});
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.logout=async (req,res)=>{
    try{
        const token=req.cookies.token || req.headers.authorization.split(' ')[1];
        await blacklisttokenmodel.create({token});
        res.clearCookie('token');
        res.status(200).send({message:'Logged out successfully'});
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.profile=async (req,res)=>{
    try{
        const user=req.user;
        res.status(200).send(user);
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.acceptride=async (req,res)=>{
    try{
        const {rideId}=req.query;
        const ride=await ridemodel.findById(rideId);
        if(!ride){
            return res.status(404).json({message:'Ride not found'});
        }
        ride.status='accepted';
        await ride.save();
        res.status(200).send(ride);
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.acceptride = async (req, res) => {
    // Long polling: wait for 'ride-accepted' event
    rideEventEmitter.once('ride-accepted', (data) => {
        res.send(data);
    });

    // Set timeout for long polling (e.g., 30 seconds)
    setTimeout(() => {
        res.status(204).send();
    }, 30000);
}

subscribeToQueue('ride-accepted', async (msg) => {
    const data = JSON.parse(msg);
    rideEventEmitter.emit('ride-accepted', data);
});
