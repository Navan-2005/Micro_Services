const jwt=require('jsonwebtoken');
const usermodel=require('../models/ride.model');
const blacklisttokenmodel=require('../models/blacklist.model')
const axios=require('axios');

module.exports.userAuth=async(req,res,next)=>{
    try {
        const token=req.cookies.token || req.headers.authorization.split(' ')[1];
        console.log(token);
        
        if(!token){
            console.log('Unauthorized');
            
            return res.status(401).json({message:'Unauthorized'});
        }

        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        
        const response=await axios.get('http://localhost:3000/user/profile',
            {headers: {
                'Authorization': `Bearer ${token}`
            }
        }
        )

        const user=response.data;
        if(!user){
            return res.status(401).json({message:'Unauthorized'});
        }
        req.user=user;
        console.log("Ride Authorisation Done");
        
        next();

    } catch (error) {
        res.status(500).json({message:error.message});
    }
}

module.exports.captainAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[ 1 ];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const response = await axios.get('http://localhost:3000/captain/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        const captain = response.data;

        if (!captain) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.captain = captain;

        next();

    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}