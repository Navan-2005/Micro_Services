const express=require('express');
const dotenv = require('dotenv')
dotenv.config()
const cookieParser = require('cookie-parser')
const router=require('./routes/captain.routes')
// const router = express.Router();
const connect=require('./db/db');
const RabbitMQ=require('./service/rabbit'); 

RabbitMQ.connect();
const app=express();
app.use(express.json())

connect()


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('',router);
module.exports=app