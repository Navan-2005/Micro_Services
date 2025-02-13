const mongoose=require('mongoose');

function connect(){
    mongoose.connect(process.env.MONGO_URL)
    .then(()=>{
        console.log('connected to db');
    })
    .catch((err)=>{
        
    })
}

module.exports=connect