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
    var subExpire = new Date('03/04/2022');
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
unlimitedAccess("dannyoma77gmail.com");