require('dotenv').config();
var mongoose = require('mongoose');

if (process.env.MODE == 'production') {
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

require("./models/User");


var User = mongoose.model("User");

var unlimitedAccess = async (id) => {
    var subTime = new Date();
    var subType = 2;
    var subscribed = true;
    var subExpire = new Date('03/04/2222');
    if (id.includes('@') || id.includes('.com')){
        console.log('an email')
        var _req = await User.updateOne({email : id},{$set:{subTime : subTime,subscribed : subscribed,subType : subType, subExpire : subExpire}});
        console.log(_req);
    }
    else{
        console.log('id')
        var _req = await User.updateOne({_uid : id},{$set:{subTime : subTime,subscribed : subscribed,subType : subType, subExpire : subExpire}});
        console.log(_req);
    }
}

var extraDate = async (d) => {
    var _req = await User.find({subscribed : true});
    _req.forEach(req => {
        var _cTime = req.subTime;
        var _subTime = _cTime + 1;
        req.subTime = _subTime;
        req.save();
    })

}

var updateFields = async () => {
    var fields = {
        unpaidReferrals : 0,
        paidReferrals : 0,
        referredBy : 'rocket125x'
    }
    var _req = await User.updateMany({},{$set: fields});
    console.log(_req);
}
//unlimitedAccess();
updateFields();