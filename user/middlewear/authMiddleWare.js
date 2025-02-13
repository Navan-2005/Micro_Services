const jwt=require('jsonwebtoken');
const usermodel=require('../models/usermodel');
const blacklisttokenmodel=require('../models/blacklist.model')


module.exports.userAuth=async(req,res,next)=>{
    try {
        const token=req.cookies.token || req.headers.authorization.split(' ')[1];
        if(!token){
            return res.status(401).json({message:'Unauthorized'});
        }  
        const isBlacklisted=await blacklisttokenmodel.findOne({token});
        if(isBlacklisted){
            return res.status(401).json({message:'Unauthorized'});
        }
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        console.log('Decoded ID:',decoded.id);
        
        
        const user=await usermodel.findById(decoded.id);
        if(!user){
            return res.status(401).json({message:'Unauthorized'});
        }
        console.log(user);
        
        req.user=user;
        next();
    } catch (error) {
        res.status(500).json({message:error.message});
    }
}