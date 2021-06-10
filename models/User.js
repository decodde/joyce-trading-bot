var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var user = new Schema({
    email:{type: String},
    admin : {type : Boolean, default : false},
    password : {type : String},
    binanceApiKey : {type : String},
    binanceApiSecret : {type : String}
});
module.exports=mongoose.model("User",user)