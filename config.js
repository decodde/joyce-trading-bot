require("dotenv").config();

const test = false;
const config = {
    test : true,
    apiKey : test ? process.env.API_KEY_TEST : process.env.API_KEY ,
    apiSecret : test ? process.env.API_SECRET_TEST : process.env.API_SECRET,
    botTimeFrame : "1m",
    timerAdjust : Number(process.env.TIMER_ADJUST),
    url : test ? "https://testnet.binancefuture.com/fapi/v1/" : "https://fapi.binance.com/fapi/v1",
    wsUrl : test ? "wss://testnet.binance.vision/ws" : "wss://fstream.binance.com/ws"
}
//console.log(process.env.API_KEY)
exports.config = config;