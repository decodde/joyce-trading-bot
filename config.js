require("dotenv").config();

const test = false;
const config = {
    test : false,
    apiKey : test ? process.env.API_KEY_TEST : process.env.API_KEY ,
    apiSecret : test ? process.env.API_SECRET_TEST : process.env.API_SECRET,
    botTimeFrame : "1m",
    timerAdjust : Number(process.env.TIMER_ADJUST),
    url : test ? "https://testnet.binancefuture.com/fapi/v1/" : "https://fapi.binance.com/fapi/v1",
    wsUrl : test ? "wss://testnet.binance.vision/ws" : "wss://fstream.binance.com/ws",
    testUrl : "https://testnet.binancefuture.com/fapi/v1/",
    testWs : "wss://testnet.binance.vision/ws" ,
    testApiKey : "0bac0f08605f8bde64f40fba2b582378084b7b678713ea58510f458307f1edec",
    testApiSecret : "d9a66ed003b6b36020c9c33c0cf511d33a4ea2af1c3969b05b201306ded72ab9",
    tpslTweak : 1,
    marginPercent : 0.1,
    defaultLeverage : 20,
    defaultPayCoin : 'USDT',
    defaultPayAddress : '0xcaea7d5092252c214d0de373fd59a708fab9fdf5',
    oneWeek : 100,
    twoWeek : 180,
    limitDayPay : 2,
    callbackRate : '0.3'
}
//console.log(process.env.API_KEY)
exports.config = config;