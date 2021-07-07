const Binance = require("binance-api-node").default;

const drawCandleStick  = require("draw-candlestick");

var mongoose = require('mongoose');
require('dotenv').config();
var Schema = mongoose.Schema;
require("./models/Setting");
var Setting = mongoose.model("Setting");
const {Support} = require("./controllers/Support");
var mongodbURL = ""
if (process.env.mode == 'production') {
    mongodbURL = process.env.MONGO_DB_PROD;
}
else {
    mongodbURL = process.env.MONGO_DB_DEV;
}

try {
    mongoose.connect(mongodbURL);
} catch (error) {
    throw error;
}

const client = Binance();
const {config} = require("./config");
const authClient = Binance(config);

const _indicator = require("technicalindicators");

/*setInterval(()=>{
    _emaData("XRPUSDT");
},2000)
*/

var _emaData = async (symbol) => {
    let ema_10_Data = await ema(10, "close", "binance", symbol, config.botTimeFrame, true);
    let ema_50_Data = await ema(50, "close", "binance", symbol, config.botTimeFrame, true);
    let ema_200_Data = await ema(200, "close", "binance", symbol, config.botTimeFrame, true);
    console.log(`EMA 10 : : ${ema_10_Data[ema_10_Data.length - 1]}`);
    console.log(`EMA 50 : : ${ema_50_Data[ema_50_Data.length - 1]}`);
    console.log(`EMA 200 : : ${ema_200_Data[ema_200_Data.length - 1]}`);
    return {
        ema_10_Data : ema_10_Data,
        ema_50_Data : ema_50_Data,
        ema_200_Data : ema_200_Data
    }
}

var newOrder = async (param) => {
    //symbol,side,type,stopPrice,callbackRate,activationPrice
}

var getSupports = async (_df) => {
    let df = {},support,_supports = [];
    df.openTime = _df.map(x => x.openTime);
    df.closeTime = _df.map(x => x.closeTime);
    df.low = _df.map(x => x.low);
    for(var i=0;i<df.low.length;i++){
        support = df['low'][i] < df['low'][i -1] && df['low'][i] < df['low'][i + 1] && df['low'][i+1] < df['low'][i+2] && df['low'][i-1] < df['low'][i-2];
        support ? _supports.push({p:df['low'][i],b:support,oT : df['openTime'][i], cT : df['closeTime'][i]}) : "" ;
    }
    return {
        supports : _supports,
        last_two : [
            _supports[_supports.length - 1],
            _supports[_supports.length - 2]
        ],
        two_support_away : _supports[_supports.length - 2],
        one_support_away : _supports[_supports.length - 1]
    }
}

var getResistance = async (_df) => {
    let df = {},resistance,_resistance = [];
    df.openTime = _df.map(x => x.openTime);
    df.closeTime = _df.map(x => x.closeTime);
    df.high = _df.map(x => x.high);
    for (var i = 0; i < df.high.length; i++){
        resistance = df['high'][i] > df['high'][i -1] && df['high'][i] > df['high'][i + 1] && df['high'][i+1] > df['high'][i+2] && df['high'][i-1] > df['high'][i-2];
        resistance ? _resistance.push({p:df['high'][i],b:resistance,oT : df['openTime'][i], cT : df['closeTime'][i]}) : "" ;
    }
    return {
        resistance : _resistance,
        last_two : [
            _resistance[_resistance.length - 1],
            _resistance[_resistance.length - 2]
        ],
        two_resistance_away : _resistance[_resistance.length - 2],
        one_resistance_away : _resistance[_resistance.length - 1]
    }
}

var getCandles = async (symbol) => {
    
    var _candles = await authClient.futuresCandles({symbol : symbol,limit:10,interval : config.botTimeFrame});
    return {
        all : _candles,
        lastCandle : _candles.slice(-1)[0]
    }
}
var candles = [];
var allCandles;
var last_three = [];

const _candlestick = {
    
    formatCandles : async (candles) => {
        if (candles.constructor.name.toLowerCase() == "array"){
            let _candles = {};
            _candles.volume = candles.map(x => x.volume);
            _candles.open = candles.map(x => x.open);
            _candles.close = candles.map(x => x.close);
            _candles.openTime = candles.map(x => x.openTime);
            _candles.closeTime = candles.map(x => x.closeTime);
            _candles.low = candles.map(x => x.low);
            return _candles;
        }
        else if (candles.constructor.name.toLowerCase() == "object"){
            return console.log("CANDLES ALREADY FORMATTED");
        }
        else {
            return console.log("ERROR FORMATTING CANDLES");
        }
    },
    isBearish : async (candle) => {
        return candle['close'] < candle['open'];
    },
    isBullish : async (candle) => {
        return candle['close'] > candle['open'];
    },
     isBearishEngulfing : async () => {
        return null
    },
    /* 
        isBullishEngulfing() checks from an array of candles and returns true for each index if its a bullish engulfing
    */
    isBullishEngulfing : async (candles,index) => {
        let currentDay = candles[index];
        let previousDay = candles[index - 1];
        if ((await _candlestick.isBearish(previousDay)) && currentDay['close'] > previousDay['open'] && currentDay['open'] < previousDay['close']) {
            return true;
        }
        else {
            return false;
        }
        
    }
}

/*
setInterval(async () => {
    allCandles = await getCandles("BTCUSDT");
    getSupports(allCandles)
    var aCandle = allCandles.lastCandle;
    if (candles.length == 100){
        candles.shift();
    }
    console.log(`candleOpen :: ${aCandle.open}`);
    console.log(`candleClose :: ${aCandle.close}`);
    if(aCandle.close > aCandle.open){
        console.log("GREEN CANDLE; Buyers having the upper hand");
    }
    else if (aCandle.open > aCandle.close){
        console.log("RED CANDLE; Sellers having the upper hand")
    }
    else {
        console.log("`\_(*-*)_/`")
    }
    candles.push(aCandle);

},50000)
*/
test = async () => {
    allCandles = await (await getCandles("BTCUSDT")).all;
    /*
    var supports = await getSupports(allCandles);
    var resistances = await getResistance(allCandles);
    */
   
    //var allCandlesFormat = await _candlestick.formatCandles(allCandles);
    var eng = await _candlestick.isBullishEngulfing(allCandles,10);
    console.log("eng:: ",eng)
    for (var i = 1 ; i < allCandles.length; i++){
        var isB_E = await _candlestick.isBullishEngulfing(allCandles,i);
        console.log(`${isB_E} `)
    }
}

class Bot {
    constructor(id,config) {

    }
    run () {

    }
}
sleep = (x) => {
    return new Promise(resolve => {
		setTimeout(() => { resolve(true) }, x )
	}); 
}
myIntervals = {

}

const timer = {

}

//STRATEGY ONE
//When there is a bullish engulfing
//  Position : BUY
//  STOP_LOSS : 2 SUPPORTS AWAY FROM ENTRY POINT
//
//
var strategy_one = async (symbol,id,quantity,price) => {
    console.log(`....starting bot with strategy one on ${symbol} for id::  ${id}`);
    //get candles after 40sec ...so as not to miss out
    //last 100 candles for support and resistance  --lets use 200candles
    //last 4 candles should be stripped to get bullish/bearish engulfing
    myIntervals[id] = setInterval(async () => {
        //get the candles
        allCandles = await getCandles(symbol);

        var aCandle = allCandles.lastCandle;
        if (candles.length == 100){
            candles.shift();
        }
        if(aCandle.close > aCandle.open){
            console.log("GREEN CANDLE; Buyers having the upper hand");
        }
        else if (aCandle.open > aCandle.close){
            console.log("RED CANDLE; Sellers having the upper hand")
        }
        else {
            console.log("`\_(*-*)_/`")
        }
        candles.push(aCandle);

        var last_fifty = allCandles.all;
        var _last_fifty = last_fifty.slice(-2,);
        let last_fifty_format = {
            open : _last_fifty.map(x => x.open),
            close : _last_fifty.map(x=> x.close),
            high : _last_fifty.map(x => x.high),
            low : _last_fifty.map(x => x.low),
            openTime : _last_fifty.map(x => x.openTime),
            closeTime : _last_fifty.map(x => x.closeTime)
        }
        allCandles = await allCandles.all;
        //get support levels from candle data
        var supports = await getSupports(allCandles);
        //get resistance levels from candlesticks
        var resistance = await getResistance(allCandles);
        let isBullE = _indicator.bullishengulfingpattern(last_fifty_format);
        let isBearE = _indicator.bearishengulfingpattern(last_fifty_format);
        console.log(isBullE," : ", isBearE)
        if (isBullE){
            console.log(`Bullish Engulfing found ::  ${last_fifty_format['close']}`);
            //get last two supports
            var _two_support_away = supports.two_support_away;
            var _one_support_away = supports.one_support_away;
            var _two_resistance_away = resistance.two_resistance_away;
            var _one_resistance_away = resistance.one_resistance_away;
            var acctBal = await authClient.futuresAccountBalance();
            var openOrders = await authClient.futuresOpenOrders();
            console.log("JOYCE about to enter a BUY position")
            console.log(`Your futures balance: ${acctBal}`);
            console.log(`Open Orders:: `,openOrders);
            var _openOrder = await authClient.order({
                symbol : symbol,
                side : "BUY",
                quantity : quantity
            })
        }
        else if (isBearE){
            console.log(`Bearish Engulfing found ::  ${last_fifty_format['close']}`)
        }
        else {
            console.log(`Nothing here::: joyce will keep checking`)
        }
    },config.timerAdjust);
}

const strategy_two = async (symbol,id) => {
    var cross = false;
    var crossSignal = false;
    myIntervals[id]= setInterval(async () => {
        //get the candles
        allCandles = await getCandles(symbol);

        var aCandle = allCandles.lastCandle;
        if (candles.length == 100){
            candles.shift();
        }
        if(aCandle.close > aCandle.open){
            console.log("GREEN CANDLE; Buyers having the upper hand");
        }
        else if (aCandle.open > aCandle.close){
            console.log("RED CANDLE; Sellers having the upper hand")
        }
        else {
            console.log("`\_(*-*)_/`")
        }
        candles.push(aCandle);

        allCandles = await allCandles.all;
        //get support levels from candle data
        var supports = await getSupports(allCandles);
        //get resistance levels from candlesticks
        var resistance = await getResistance(allCandles);
        let isBullE = _indicator.bullishengulfingpattern(last_fifty_format);
        let isBearE = _indicator.bearishengulfingpattern(last_fifty_format);
        console.log(isBullE," : ", isBearE)


        //CHECK EMA dATA
        var _ema10 = await (await _emaData()).ema_10_Data;
        var _ema50 = await (await _emaData()).ema_50_Data;
        var _ema200 = await (await _emaData()).ema_200_Data;
        
        if(_ema10 == _ema50){
            cross = true;
        }
        if (cross == true && _ema10 > _ema50){
            crossSignal = true;
            console.log(".....EMA CROSS... Signal loading");
        }
        else if (cross == true && _ema10 < _ema50){
            cross = false;
        }
        else {
            console.log("rechecking for cross signal");
        }

        if (isBullE){
            console.log(`Bullish Engulfing found ::  ${last_fifty_format['close']}`);
            //get last two supports
            var _two_support_away = supports.two_support_away;
            var _one_support_away = supports.one_support_away;
            var _two_resistance_away = resistance.two_resistance_away;
            var _one_resistance_away = resistance.one_resistance_away;
            var acctBal = await authClient.futuresAccountBalance();
            var openOrders = await authClient.futuresOpenOrders();
            console.log("JOYCE about to enter a BUY position")
            console.log(`Your futures balance: ${acctBal}`);
            console.log(`Open Orders:: `,openOrders);
            var _openOrder = await authClient.order({
                symbol : symbol,
                side : "BUY",
                quantity : quantity
            })
        }
        else if (isBearE){
            console.log(`Bearish Engulfing found ::  ${last_fifty_format['close']}`)
        }
        else {
            console.log(`Nothing here::: joyce will keep checking`)
        }
    },config.timerAdjust)
}
/*
strategy_one("BTCUSDT","43T2DS")
*/