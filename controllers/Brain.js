const {Response} = require("./misc/Response");
require('dotenv').config();
var mongoose = require('mongoose');
const crypt=require("crypto");
const { Constants } = require("./misc/Constants");
const { Misc } = require("./misc/Misc");

var mongodbURL = "";
if (process.env.mode == 'production') {
    mongodbURL = process.env.MONGO_DB_PROD;
}
else {
    mongodbURL = process.env.MONGO_DB_DEV;
}
console.log(mongodbURL);
try {
    mongoose.connect(mongodbURL);
} catch (error) {
    throw error;
}

require("../models/Order");
require("../models/User");



var Order = mongoose.model("Order");
var User = mongoose.model("User");

const Brain = { 
    login : async (body) => {
        var {email,password} = body;
        console.log(email)
        var _req = await User.findOne({email : email});
        if(_req == null){
            return Response.error(Constants.LOGIN_FAILED);
        }
        else {
            password = await Misc.hashPassword(password);
            if (_req.password == password){
                return Response.success(Constants.LOGIN_SUCCESS,_req);
            }
            else {
                return Response.error(Constants.LOGIN_FAILED);
            }
        }
    },
    onboard : async (user) => {
        var {email,password} = user;
        user.password = await Misc.hashPassword(password);
        var _req = await User.findOne({email : email});
        if(_req == null){
            try{
                var _user = new User(user)
                _user.save();
                return Response.success(Constants.SIGNUP_SUCCESS);
            }
            catch(e){
                return Response.error(Constants.DB_ERROR);
            }
        }
        else { 
            return Response.error(Constants.EMAIL_EXISTS)
        }
    },
    saveOrder : async (order) => {
        var _order = new Order(order);
        try{
            await _order.save();
            return true
        }
        catch(e) { 
            console.log("JOYCE.SAVEORDER  :",e);
            return false
        }
    },
    checkOrder : async (symbol,price) => {
        console.log(symbol)
        price = price.toString()
            var _check = await Order.find({symbol : symbol,$or :[{takeProfitPrice : price},{stopLossPrice : price}]});
            console.log(_check)
            if(_check.length > 0){
                return Response.success(true,_check);
            }
            else {
                return Response.error();
            }
    },
    user : {
        getBinanceKeys : async (user) => {
            var _req = await User.findOne({email :user});
            if (_req == null){
                return Response.error(Constants.USER_NOT_FOUND);
            }
            else {
                var keys = {
                    binanceApiKey : _req.binanceApiKey,
                    binanceApiSecret : _req.binanceApiSecret
                }
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,keys);
            }
        },
    }

}

exports.Brain = Brain;