const crypt = require("crypto");

const Misc = {
    generateOrderId : async (id,symbol,t) => {
        t ? t = t : t = new Date().getUTCMilliseconds();
        return `${id}_${symbol}_${t}`
    },
    hashPassword : (password) => {
        var mykey = crypt.createCipher('aes-256-gcm', "greatllight", null);
        var mystr = mykey.update(password, 'utf8', 'hex');
        mystr += mykey.final('hex');
        return mystr;
    }
}

exports.Misc = Misc;