const crypt = require("crypto");
var mongoose = require('mongoose');

require("../../models/Order");
require("../../models/User");
var Order = mongoose.model("Order");
var User = mongoose.model("User");


const Misc = {
    sendWithdrawMail:  (address, email, id, referrals,url) => {
        const mailjet = require ('node-mailjet')
        .connect('a7ac20901a0de0a759e473bb48ab7421', '485bc19755ea9b9408f3cbe3b4755aa4')
        const request = mailjet
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": "rocket125x@rocket125x.com",
                            "Name": "rocket125x"
                        },
                        "To": [
                            {
                                "Email": "evang.obembeemmanuel@gmail.com",
                                "Name": "Apostle"
                            }
                        ],
                        "Subject": `Referral Earnings Withdrawal by ${id}`,
                        "TextPart": "Rocket125x Withdraw",
                        "HTMLPart": `I would like to withdraw my referral earnings \n My address : <b> ${address}</b> \n No of Referrals : <b> ${referrals}</b>
                                        Id : ${id}, Email : ${email}. \n <a href = ${url}>Bsc link</a>`,
                        "CustomID": 'withdraw123'
                    }
                ]
            })
            request
            .then((result) => {
              console.log(result.body)
            })
            .catch((err) => {
              console.log(err.statusCode)
            })
    },
    generateOrderId: async (id, symbol, t, num) => {
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
        return `${strat}${id}${t}`;

    },
    isBotExpired: async (_d, subType) => {
        var expireDays, diff, _diff;
        if (subType == 1) {
            expireDays = 7;
        }
        else if (subType == 2) {
            expireDays = 14;
        }
        else {
            expireDays = 99999999999999999999999999999999999999999;
        }
        if (_d) {
            _d = new Date(_d);
            var now = new Date();
            diff = _d - now;
            _diff = (diff / (60 * 60 * 24 * 1000)) % 365;
        }
        else {
            _diff = 9999999999999999999
        }
        if (_diff >= 0 && _diff <= expireDays) {
            return false;
        }
        else {
            return true;
        }
    },
    hashPassword: (password) => {
        var mykey = crypt.createCipher('aes-256-gcm', "greatllight", null);
        var mystr = mykey.update(password, 'utf8', 'hex');
        mystr += mykey.final('hex');
        return mystr;
    },
    genId: async () => {
        return Math.round((Math.random() * 36 ** 7)).toString(36);
    },
    generateId: async () => {
        var _id = await Misc.genId();
        var _req = await User.findOne({ _uid: _id });
        if (_req == null) {
            return _id;
        }
        else {
            return generateId();
        }
    }
}

//Misc.sendWithdrawMail("8742y8yn829u0802","ty@mail.com","728",90);
exports.Misc = Misc;