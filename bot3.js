const api = require('@marcius-capital/binance-api');
const Binance = require("binance-api-node").default;


const ws = require("ws");
const ccxt = require('ccxt');

const {testConsole:test} = require("./testConsole");
const client = Binance();
const {config} = require("./config");
const _bConfig = {
    apiKey : config.apiKey,
    apiSecret : config.apiSecret,
    httpFutures : true,
}
const authClient = Binance(_bConfig);

const {Misc} = require("./Misc");

const _indicator = require("technicalindicators");
/*
/////
////SECOND BINANCE*/
const _Binance = require("node-binance-api");

var __bConfig = {}
__bConfig.APIKEY = config.apiKey;
__bConfig.APISECRET = config.apiSecret;
const _binance = new _Binance().options(__bConfig);

const {Brain} = require("./controllers/Brain");
const fetch = require('node-fetch');
const crypto = require('crypto')




var getCandles = async (symbol) => {
    var _candles = await client.futuresCandles({symbol : symbol,limit:200,interval : config.botTimeFrame});

    return {
        all : _candles,
        lastCandle : _candles.slice(-1)[0],
        last3Candle : _candles.slice(-3)
    }
}


const exchangeId = 'binance';
const exchangeClass = ccxt[exchangeId];
const binance_ccxt = new exchangeClass ({
                                    'apiKey': config.apiKey,
                                    'secret': config.apiSecret,
                                    'options': {                 // options
                                        'defaultType': 'future', // the defaultType inside options
                                    },
                                    
                                });
binance_ccxt.setSandboxMode(true);

const enableHedgeMode = async () => {
    const to_sign = `dualSidePosition=true&timeStamp=${Date.now()}`

    const hmac = crypto.createHmac('sha256', config.apiSecret)
        .update(to_sign)
        .digest('hex')
    console.log(to_sign)
    console.log(hmac)

    try {
        const res = await fetch(`${config.url}positionSide/dual?${to_sign}&signature=${hmac}`, {
            headers: {
                'X-MBX-APIKEY': `${config.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const json = await res.json();
        console.log(json)
        return json
    } catch (error) {
        console.error(error)
    }
}

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
    engulfed : async (candles) => {
        let currentDay = candles[1];
        let previousDay = candles[0];
        let currentDayOpen = Number(currentDay['open']);
        let currentDayClose = Number(currentDay['close']);
        let previousDayOpen = Number(previousDay['open']);
        let previousDayClose = Number(previousDay['close']);
        let previousDayHeight = Math.abs(previousDayOpen - previousDayClose);
        let currentDayHeight = Math.abs(currentDayOpen - currentDayClose);
        let _confirmed = false;
        test.warn(`TEST:: CDH : ${currentDayHeight}  ||  PDH : ${previousDayHeight}`);
        if (currentDayHeight > previousDayHeight){
            test.warn("TEST::  currentDayHeight is bigger than previous day");
            _confirmed = true;
        }
        else if (previousDayHeight > currentDayHeight){
            test.warn("TEST:: previousDayHeight is bigger than current day");
            _confirmed = false;
        }
        else {
            test.warn("TEST:: checkmate?")
            _confirmed = false;
        }
        return _confirmed;
    },
    isBearish : async (candle) => {
        var openCandle = Number(candle['open']);
        var closeCandle = Number(candle['close']);
        return openCandle > closeCandle;
    },
    isBullish : async (candle) => {
        var openCandle = Number(candle['open']);
        var closeCandle = Number(candle['close']);
        return (closeCandle > openCandle && openCandle < closeCandle);
    },
     isBearishEngulfing : async (candles) => {
        let currentDay = candles[1];
        let previousDay = candles[0];
        let isPreviousDayBullish = await _candlestick.isBullish(previousDay);
        let isCurrentDayBearish = await _candlestick.isBearish(currentDay);
        let _engulfed = await _candlestick.engulfed(candles);
        return isPreviousDayBullish && isCurrentDayBearish && _engulfed;
    },
    /* 
        isBullishEngulfing() checks from an array of candles and returns true for each index if its a bullish engulfing
    */
    isBullishEngulfing : async (candles) => {
        let currentDay = candles[1];
        let previousDay = candles[0];
        let _engulfed = await _candlestick.engulfed(candles);
        let isPreviousDayBearish = await _candlestick.isBearish(previousDay);
        let isCurrentDayBullish = await _candlestick.isBullish(currentDay);
        return isPreviousDayBearish && isCurrentDayBullish && _engulfed;
    }
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

var getTakeProfit = async (side,arr,_currentClosePrice,takeProfit) => {
    if(side == 'BUY'){
        var tp ;
        if(_currentClosePrice <= takeProfit){
            tp = takeProfit['p'];
        }
        else {
            tp = arr.reverse().find(o => o['p'] > _currentClosePrice)['p'];
        }
        return tp ? tp : takeProfit;
    }
    else if(side == 'SELL'){
        var tp;
        if(_currentClosePrice >= takeProfit){
            tp = takeProfit['p'];
        }
        else {
            tp = arr.reverse().find(o => o['p'] < _currentClosePrice)['p'];
        }
        return tp ? tp : takeProfit
    }
    else {
        console.log("invalid side");
    }
}
var getStopLoss = async(side,arr,_currentClosePrice,stopLoss) => {
    var sl;
    if (side == 'BUY'){
        if (_currentClosePrice >= stopLoss) {
            sl = stopLoss['p'];
        }
        else {
            sl = arr.reverse().find(o => o['p'] < _currentClosePrice)['p'];
        }
        return sl ? sl : stopLoss;
    }
    else if(side == 'SELL'){
        if(_currentClosePrice <= stopLoss){
            sl = stopLoss['p'];
        }
        else {
            sl = arr.reverse().find(o => o['p'] > _currentClosePrice)['p'];
        }
        return sl ? sl : stopLoss;
    }
}
var myIntervals = {};
cancelExistingOrder = async (symbol,_currentPrice) => {
    console.log(symbol," <:::> ",_currentPrice)
    var _r = await Brain.checkOrder(symbol,_currentPrice);
    if(_r.type == 'success'){
        console.log("exist: ",_r.data);
        console.log("CANCELING ORDERS. .. .");
        return
    }
    else {
        return
    }
}
const strategy = {
    oneStream : async (symbol,id) =>{
        var signalFound = false;
        return new Promise(async (resolve,reject) => {
            var _firstCandles = await getCandles(symbol);
            var lastCandles = _firstCandles.last3Candle;
            
            api.stream.kline({symbol:symbol,interval:'1m'},async (data) => {
                test.log(`final? : ${data.kline.final}`);    
                await cancelExistingOrder(symbol,data.kline.close);
                _candle = data.kline;
                if (data.kline.final){
                    
                    if(await _candlestick.isBearish(_candle)){
                        test.log("RED CANDLE");
                    }
                    else if (await _candlestick.isBullish(_candle)){
                        test.log("GREEN CANDLE");
                    }
                    else {
                        test.log(".......")
                    }
                    if(lastCandles.length == 3){
                        lastCandles.shift();
                    }
                    lastCandles.push(_candle);           
                    signalFound = false;         
                }
                let last_two = lastCandles.slice(-2,);
                //get support levels from candle data
                var supports = await getSupports(_firstCandles.all);
                //get resistance levels from candlesticks
                var resistance = await getResistance(_firstCandles.all);
                var isBullE = await _candlestick.isBullishEngulfing(last_two);
                var isBearE = await _candlestick.isBearishEngulfing(last_two);
                var _currentClosePrice = Number(last_two[1]['close']).toFixed(3);
                test.log(isBullE," : ", isBearE);

                if (isBullE){
                    //BUY POSITION
                    if (signalFound == false){
                        console.log(`Bullish Engulfing found `)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        console.log(supports.last_two);
                        var stopLoss = await getStopLoss('BUY',supports.supports,_currentClosePrice, supports.two_support_away.p);
                        var takeProfit = await getTakeProfit('BUY',resistance.resistance,_currentClosePrice,resistance.two_resistance_away.p);//tweaking needed

                        console.log(`test stop_loss: ${_currentClosePrice}|${stopLoss} > `,_currentClosePrice >= stopLoss );
                        console.log(`test take_profit:  ${_currentClosePrice}|${takeProfit} > `,_currentClosePrice <= takeProfit);
                        //check if takeProfit and stopLoss situable ; if not get another
                        //(_currentClosePrice >= stopLoss) ? "" : stopLoss = await getStopLoss(supports.supports,_currentClosePrice,stopLoss);
                        

                        console.log(`Two support points away:: ${supports.two_support_away.p}`);
                        console.log(`Two resistance points away:: ${resistance.two_resistance_away.p}`);

                        var _customId = await Misc.generateOrderId(id,symbol,last_two[1]['closeTime']);

                        console.log(_customId);
                        var newOrder = await testOrder('BUY',symbol,_customId,_currentClosePrice,takeProfit,stopLoss);
                        /*
                        var newOrder = await authClient.orderTest({
                            symbol : symbol,
                            side : "BUY",
                            quantity : "100",
                            type : 'TRAILING_STOP_MARKET',
                            newClientOrderId : _customId,
                            callbackRate : '0.65'
                        });
                        */
                        console.log(newOrder);
                        signalFound = true;
                    }
                }
                else if (isBearE){
                    if(signalFound == false){
                        console.log(`Bearish Engulfing found`)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        console.log(supports.last_two);
                        console.log(`Two support points away:: ${supports.two_support_away}`);
                        var _customId = await Misc.generateOrderId(id,symbol,last_two[1]['closeTime']);
                        var stopLoss = await getStopLoss('SELL',supports.supports,_currentClosePrice, supports.two_support_away.p);
                        var takeProfit = await getTakeProfit('SELL',resistance.resistance,_currentClosePrice, resistance.two_resistance_away.p);


                        console.log(_customId)
                        console.log(`sell_test stop_loss: ${_currentClosePrice}|${stopLoss} >> `,_currentClosePrice <= stopLoss );
                        console.log(`sell_test take_profit:  ${_currentClosePrice}|${takeProfit} >> `,_currentClosePrice >= takeProfit);
                        var newOrder = await testOrder('SELL',symbol,_customId,_currentClosePrice,takeProfit,stopLoss);
                        /*
                        var newOrder = await authClient.orderTest({
                            symbol : symbol,
                            side : "BUY",
                            quantity : "100",
                            type : 'TRAILING_STOP_MARKET',
                            newClientOrderId : _customId,
                            callbackRate : '0.65'
                        });
                        */
                        console.log(newOrder)
                        signalFound = true;
                    }
                }
                else {
                    console.log(`Nothing here::: joyce will keep checking`)
                }
                resolve(data);
            });

        });
    }
}

//STRATEGY ONE
//When there is a bullish engulfing
//  Position : BUY
//  STOP_LOSS : 2 SUPPORTS AWAY FROM ENTRY POINT
//
//
var strategy_one = async (symbol,id) => {
    console.log(`....starting bot with strategy one on ${symbol}`);
    strategy.oneStream(symbol,id)
}

const placeOrder = async (o, st) => {
    const to_sign = `symbol=${o.symbol}&side=${o.side}&type=${o.type}&callbackRate=${o.callbackRate}&timeInForce=${o.timeInForce}&quantity=${o.quantity}&newClientOrderId=${o.newClientOrderId}&timestamp=${o.timestamp}`

    const hmac = crypto.createHmac('sha256', config.apiSecret)
        .update(to_sign)
        .digest('hex')
    console.log(to_sign)
    console.log(hmac)

    try {
        const res = await fetch(`${config.url}order?${to_sign}&signature=${hmac}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': `${config.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const json = await res.json()
        return json
    } catch (error) {
        console.error(error)
    }

}
const _placeOrder = async (o, st) => {
    const to_sign = `symbol=${o.symbol}&side=${o.side}&type=${o.type}&quantity=${o.quantity}&newClientOrderId=${o.newClientOrderId}&timestamp=${o.timestamp}`

    const hmac = crypto.createHmac('sha256', config.apiSecret)
        .update(to_sign)
        .digest('hex')
    console.log(to_sign)
    console.log(hmac)

    try {
        const res = await fetch(`${config.url}/order?${to_sign}&signature=${hmac}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': `${config.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const json = await res.json()
        return json
    } catch (error) {
        console.error(error)
    }

}

const _placeOrderStopLoss = async (o, st) => {
    const to_sign = `symbol=${o.symbol}&type=STOP&stopPrice=${o.stopLossPrice}&side=${o.side}&quantity=${o.quantity}&newClientOrderId=${o.newClientOrderId}&timestamp=${o.timestamp}`

    const hmac = crypto.createHmac('sha256', config.apiSecret)
        .update(to_sign)
        .digest('hex')
    console.log(to_sign)
    console.log(hmac)

    try {
        const res = await fetch(`${config.url}/order?${to_sign}&signature=${hmac}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': `${config.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const json = await res.json()
        return json
    } catch (error) {
        console.error(error)
    }

}

const _placeOrderTakeProfit = async (o, st) => {
    const to_sign = `symbol=${o.symbol}&type=TAKE_PROFIT&stopPrice=${o.takeProfitPrice}&side=${o.side}&quantity=${o.quantity}&newClientOrderId=${o.newClientOrderId}&timestamp=${o.timestamp}`

    const hmac = crypto.createHmac('sha256', config.apiSecret)
        .update(to_sign)
        .digest('hex')
    console.log(to_sign)
    console.log(hmac)

    try {
        const res = await fetch(`${config.url}/order?${to_sign}&signature=${hmac}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': `${config.apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        const json = await res.json()
        return json
    } catch (error) {
        console.error(error)
    }

}
/*
STOP, STOP_MARKET:
    > BUY: latest price (“MARK_PRICE” or “CONTRACT_PRICE”) >= stopPrice
    > SELL: latest price (“MARK_PRICE” or “CONTRACT_PRICE”) <= stopPrice

TAKE_PROFIT, TAKE_PROFIT_MARKET:
   > BUY: latest price (“MARK_PRICE” or “CONTRACT_PRICE”) <= stopPrice
   > SELL: latest price (“MARK_PRICE” or “CONTRACT_PRICE”) >= stopPrice
*/


///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
var testOrder = async (side,symbol,_customId,_currentClosePrice,takeProfitPrice,stopLossPrice) => {
    console.log(takeProfitPrice," <tp:::sl> ",stopLossPrice)
    
    var _order = {
        symbol: symbol,
        side: side,
        quantity: '1',
        type : 'MARKET',
        timestamp : Date.now(),
        price : _currentClosePrice,
        newClientOrderId : _customId,
        takeProfitPrice : takeProfitPrice ,
        stopLossPrice : stopLossPrice,
        by: 'dannyoma75@gmail.com'
    }
    /*
    var _order1 = await _placeOrder(_order);
    var _order2 = await _placeOrderStopLoss(_order);
    var _order3 = await _placeOrderTakeProfit(_order);
    console.log("order1::  ",_order1);
    console.log("order2::  ",_order2);
    console.log("order3::  ",_order3);
    */
    var saveOrder = await Brain.saveOrder(_order);
    console.log(saveOrder)
}
strategy_one('BNBUSDT',"98therfw9")
