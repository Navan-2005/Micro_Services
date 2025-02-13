const usermodel=require('../models/captain.model');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const blacklisttokenmodel=require('../models/blacklist.model')
const {subscribeToQueue,publishToQueue} =require('../service/rabbit')

const pendingRequests = [];


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

module.exports.toggle=async (req,res)=>{
    console.log('captain : ',req.captain);
    
    try{
        const captain=await usermodel.findById(req.captain._id);
        console.log(captain);
        
        captain.isAvailable= !captain.isAvailable;
        await captain.save();
        res.status(200).send(captain);
    }catch(err){
        console.log(err);
        
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

module.exports.waitForNewRide = async (req, res) => {
    // Set timeout for long polling (e.g., 30 seconds)
    req.setTimeout(30000, () => {
        res.status(204).end(); // No Content
    });

    // Add the response object to the pendingRequests array
    pendingRequests.push(res);
};

subscribeToQueue('new-ride', (data) => {
    const rideData = JSON.parse(data);
    console.log(rideData);
    
    // Send the new ride data to all pending requests
    pendingRequests.forEach(res => {
        res.json(rideData);
    });

    // Clear the pending requests
    pendingRequests.length = 0;
});