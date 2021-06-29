const {Response} = require("./misc/Response");
require('dotenv').config();
var mongoose = require('mongoose');
const crypt=require("crypto");
const { Constants } = require("./misc/Constants");
const { Misc } = require("./misc/Misc");
const Binance = require("binance-api-node").default;
const client = Binance();


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
    getOrder : async (id) => {
        try{
            var _req = await Order.findOne({customId : id});
            console.log("id: ",id);
            if (_req == null){
                return Response.error(Constants.DATA_EMPTY);
            }
            else {
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,{order : _req})
            }
        }
        catch(e){
            console.log(e)
            return Response.error()
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
        myOrders : async (data) => {
            var {email} = data;
            console.log(email);
            try{
                var _req = await Order.find({by : email});
                //console.log(_req);
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,_req);
            }
            catch(e){
                console.log(e);
                return Response.error(Constants.DB_ERROR);
            }            
        },
        botOrder : async (user,data) => {
            var {strategy,quantity,symbol} = data;
            var {binanceApiSecret,binanceApiKey,email} = user;
            if (binanceApiKey && binanceApiSecret){
                let _bConfig = {
                    apiKey: binanceApiKey,
                    apiSecret: binanceApiSecret,
                    httpFutures: true,
                }
                try{
                    let authClient = Binance(_bConfig);
                    let exchangeInfo = await authClient.futuresExchangeInfo();
                    console.log(authInfo);

                }
                catch(e){
                    console.log(e);
                    return Response.error();
                }
            }
            else{
                return Response.error(Constants.API_KEY_NOT_EXIST);
            }
        },
        submitKeys : async (email,data) => {
            var {apiKey,apiSecret} = data;
            let _bConfig = {
                apiKey: apiKey,
                apiSecret: apiSecret,
                httpFutures: true,
            }
            if (apiSecret && apiKey){
                try{
                    let authClient = Binance(_bConfig);
                    let authInfo = await authClient.futuresAccountInfo();
                    console.log('authIauthInfo> ',Object.keys(authInfo));
                    var _data = { 
                        availableBalance : authInfo.availableBalance,
                        totalWalletBalance : authInfo.totalWalletBalance
                    }
                    try{    
                        var saveKeys = await User.updateOne({email, email},{$set : {binanceApiKey : apiKey, binanceApiSecret : apiSecret}});
                        if (saveKeys.nModified == 1){
                            return Response.success(Constants.API_KEY_SUCCESS,_data);
                        }
                        else{
                            return Response.error(Constants.API_KEY_FAIL);
                        }
                    }
                    catch(e){
                        console.log(e);
                        return Response.error(Constants.DB_ERROR);
                    }                
                }
                catch(e){
                    console.log(e.code);
                    if (e.code == -2014){
                        console.log('2014')
                    }
                    return Response.error(Constants.API_KEY_INVALID);
                }
            }
            else {
                return Response.error(Constants.KEY_EMPTY);
            }    
        }
    }

}

exports.Brain = Brain;