const express = require('express');
const expressproxy=require('express-http-proxy');

const app=express();
app.use('/user',expressproxy('http://localhost:3001'));
app.use('/captain',expressproxy('http://localhost:3002'));
app.use('/ride',expressproxy('http://localhost:3003'));


app.listen(3000, () => {	
    console.log('Gateway service is running on port 3000');    
});