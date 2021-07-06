const {Bot} = require("../Bot");

const BotConnect = {
    
    startBot : async (auth,symbol,id,quantity,strategy) => {
        var st = await Bot.start(auth,symbol,id,quantity,strategy);
        console.log(st);
        return true;
    }
}

exports.BotConnect = BotConnect;