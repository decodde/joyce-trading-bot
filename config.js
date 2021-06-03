require("dotenv").config();

const config = {
    apiKey : process.env.API_KEY ,
    apiSecret : process.env.API_SECRET,
    botTimeFrame : "1m"
}
//console.log(process.env.API_KEY)
exports.config = config;