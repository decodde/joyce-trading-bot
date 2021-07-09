const crypt = require("crypto");
var mongoose = require('mongoose');

require("../../models/Order");
require("../../models/User");
var Order = mongoose.model("Order");
var User = mongoose.model("User");

const Misc = {
    generateOrderId : async (id,symbol,t,num) => {
        t ? t = t : t = new Date().getUTCMilliseconds();
        var strat = "rx";
        if (num == 1) {
            strat = `${strat}One`;
        }
        else if (num == 2) {
            strat = `${strat}Two`;
        }
        else {
            strat = `${strat}Three`
        }
        return `${strat}_${id}_${t}`;
        
    },
    isBotExpired : async (_d,subType) => {
        var expireDays,diff,_diff;
        if(subType == 1){
            expireDays = 7;
        }
        else if(subType == 2){
            expireDays = 14;
        }
        else {
            expireDays = 99999999999999999999999999999999999999;
        }
        if(_d){
            _d = new Date(_d);
            var now = new Date();
            diff = _d - now;
            _diff = (diff / (60*60*24*1000)) % 365;
        }
        else{
            _diff = 9999999999999999999
        }
        if ( _diff >= 0 && _diff <= expireDays ){
            return false;
        }
        else {
            return true;
        }
    },
    hashPassword : (password) => {
        var mykey = crypt.createCipher('aes-256-gcm', "greatllight", null);
        var mystr = mykey.update(password, 'utf8', 'hex');
        mystr += mykey.final('hex');
        return mystr;
    },
    genId : async () => {
        return Math.round((Math.random() * 36 ** 7)).toString(36);
    },
    generateId : async () => {
        var _id = await Misc.genId();
        var _req = await User.findOne({_uid : _id});
        if(_req == null){
            return _id;
        }
        else { 
            return generateId();
        }
    }
}

exports.Misc = Misc;