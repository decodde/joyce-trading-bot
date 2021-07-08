var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var user = new Schema({
    email:{type: String},
    admin : {type : Boolean, default : false},
    password : {type : String},
    binanceApiKey : {type : String},
    binanceApiSecret : {type : String},
    botStatus : {type : Boolean, default : false},
    _uid : {type : String},
    subscribed : {type : Boolean, default : false},
    subTime : {type : Date},
    subType : {type : Number}
});
module.exports=mongoose.model("User",user)