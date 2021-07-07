const {Response} = require("./misc/Response");
require('dotenv').config();
var mongoose = require('mongoose');
const {config} = require("../config");
const crypt=require("crypto");
const { Constants } = require("./misc/Constants");
const { Misc } = require("./misc/Misc");

const Binance = require("binance-api-node").default;
const client = Binance();


const api = require('@marcius-capital/binance-api');

const ema = require('trading-indicator').ema;
var mongodbURL = "";
const { testConsole: test } = require("../testConsole");
const { resolve } = require("path");
const { BotMonitor } = require("./BotMonitor");

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

require("../models/Order");
require("../models/User");



var Order = mongoose.model("Order");
var User = mongoose.model("User");

const Brain = { 
    login : async (body) => {
        var {email,password} = body;
        console.log(email)
        var _req = await User.findOne({email : email});
        if(_req == null){
            return Response.error(Constants.LOGIN_FAILED);
        }
        else {
            password = await Misc.hashPassword(password);
            if (_req.password == password){
                return Response.success(Constants.LOGIN_SUCCESS,_req);
            }
            else {
                return Response.error(Constants.LOGIN_FAILED);
            }
        }
    },
    onboard : async (user) => {
        var {email,password} = user;
        user.password = await Misc.hashPassword(password);
        user._uid = await Misc.generateId();
        var _req = await User.findOne({email : email});
        if(_req == null){
            try{
                var _user = new User(user)
                _user.save();
                return Response.success(Constants.SIGNUP_SUCCESS);
            }
            catch(e){
                return Response.error(Constants.DB_ERROR);
            }
        }
        else { 
            return Response.error(Constants.EMAIL_EXISTS)
        }
    },
    saveOrder : async (order) => {
        var _order = new Order(order);
        try{
            await _order.save();
            return true
        }
        catch(e) { 
            console.log("JOYCE.SAVEORDER  :",e);
            return false
        }
    },
    getOrder : async (id) => {
        try{
            var _req = await Order.findOne({customId : id});
            console.log("id: ",id);
            if (_req == null){
                return Response.error(Constants.DATA_EMPTY);
            }
            else {
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,{order : _req})
            }
        }
        catch(e){
            console.log(e)
            return Response.error()
        }
    },
    checkOrder : async (symbol,price) => {
        console.log(symbol)
        price = price.toString()
            var _check = await Order.find({symbol : symbol,$or :[{takeProfitPrice : price},{stopLossPrice : price}]});
            console.log(_check)
            if(_check.length > 0){
                return Response.success(true,_check);
            }
            else {
                return Response.error();
            }
    },
    getSymbolInfo : async (symbol) => {
        try{
            var ex = await client.futuresExchangeInfo();
            //console.log(ex)
            var filtered = ex.symbols.map(o => {return {baseAsset : o.baseAsset, pair : o.pair, filters : o.filters,quantityPrecision : o.quantityPrecision}});
            //console.log(filtered);
            return Response.success(Constants.DATA_RETRIEVE_SUCCESS,filtered);
        }
        catch(e){
            console.log(e);
            return Response.error();
        }
    },
    getLeverage : async (user,symbol) => {
        try{
            console.log(user);
            var _config = {
                apiSecret : user.binanceApiSecret,
                apiKey : user.binanceApiKey
            }
            var _client = Binance(_config)
            var lev = await _client.futuresLeverageBracket({symbol : symbol});
            return Response.success(Constants.DATA_RETRIEVE_SUCCESS,lev);
        }
        catch(e){
            BotMonitor.log('Get Leverage Error',e.message,user._uid);
            return Response.error(Constants.ERROR_FETCHING_DATA,e.message);
        }
    },
    user : {
        getBinanceKeys : async (user) => {
            var _req = await User.findOne({_uid :user});
            if (_req == null){
                return Response.error(Constants.USER_NOT_FOUND);
            }
            else {
                var keys = {
                    binanceApiKey : _req.binanceApiKey,
                    binanceApiSecret : _req.binanceApiSecret
                }
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,keys);
            }
        },
        getById : async (id) => {
            var _req = await User.findOne({_uid : id});
            if (_req == null){
                return Response.error(Constants.DATA_EMPTY);
            }
            else {
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,_req);
            }
        },
        myOrders : async (data) => {
            var {_uid} = data;
            //console.log(_uid);
            try{
                var _req = await Order.find({by : _uid});
                //console.log(_req);
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,_req);
            }
            catch(e){
                console.log(e);
                return Response.error(Constants.DB_ERROR);
            }            
        },
        botStatus : async (_uid) => {
            var _req = await User.findOne({_uid : _uid});
            if(_req == null){
                return Response.error(Constants.USER_NOT_FOUND);
            }
            else{
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS,{status : _req.botStatus})
            }
        },
        botOrder : async (user,data) => {
            var {strategy,leverage,symbol,minNotional,quantityPrecision} = data;
            var {binanceApiSecret,binanceApiKey,_uid} = user;
            if (binanceApiKey && binanceApiSecret){
                let _bConfig = {
                    apiKey: binanceApiKey,
                    apiSecret: binanceApiSecret,
                    httpFutures: true,
                }
                try{
                    let authClient = Binance(_bConfig);
                    let authInfo = await authClient.futuresAccountInfo();
                    try{
                        var availableBalance = authInfo.availableBalance;
                        leverage ? leverage : leverage = config.defaultLeverage;
                        try{
                            var lev = await authClient.futuresLeverage({symbol : symbol, leverage:leverage});
                            BotMonitor.log('Leverage Change',lev,_uid);
                            BotMonitor.log(`AvailableBalance`,availableBalance,_uid);
                            console.log(quantityPrecision);

                            (!quantityPrecision || quantityPrecision == 0) ? quantityPrecision = 1 : "";
                            let quant = (config.marginPercent * availableBalance) * leverage;
                            console.log(quant,'<|>',minNotional)
                            try{
                                if(quant >= minNotional){
                                    console.log("Seeming alright");
                                    var st = await Bot.start(_bConfig,symbol,_uid,quant,strategy,leverage,quantityPrecision,minNotional);
                                    if(st){
                                        return Response.success("seeming alright");
                                    }
                                    else {
                                        console.log("err");
                                        return Response.error("err");
                                    }
                                }
                                else{
                                    return Response.error(Constants.MARGIN_INSUFFICIENT)
                                }
                            }
                            catch(e){
                                console.log(e);
                                return Response.error(Constants.BOT_START_FAIL);
                            }
                            /*
                            * qunatity => (10% of balance)* leverage
                            */
                            //console.log(authInfo);
                        }
                        catch(e){
                            console.log(e);
                            return Response.error(Constants.LEVERAGE_SETUP_FAIL);
                        }
                    }
                    catch(e){
                        console.log(e);
                        return Response.error(Constants.ERROR_FETCHING_DATA);
                    }
                }
                catch(e){
                    console.log(e);
                    return Response.error(e.message,[e.code,e.message]);
                }
            }
            else{
                return Response.error(Constants.API_KEY_NOT_EXIST);
            }
        },
        stopBot : async (user) => {
            var {_uid} = user;
            var stop = await Bot.stop(_uid);
            return stop;
        },
        submitKeys : async (_uid,data) => {
            var {apiKey,apiSecret} = data;
            let _bConfig = {
                apiKey: apiKey,
                apiSecret: apiSecret,
                httpFutures: true,
            }
            if (apiSecret && apiKey){
                try{
                    let authClient = Binance(_bConfig);
                    let authInfo = await authClient.futuresAccountInfo();
                    test.log('authIauthInfo> ',Object.keys(authInfo));
                    var _data = { 
                        availableBalance : authInfo.availableBalance,
                        totalWalletBalance : authInfo.totalWalletBalance
                    }
                    try{    
                        var saveKeys = await User.updateOne({_uid: _uid},{$set : {binanceApiKey : apiKey, binanceApiSecret : apiSecret}});
                        BotMonitor.log('SUBMIT KEYS: save',saveKeys,_uid);
                        if (saveKeys.ok == 1){
                            BotMonitor.log('SUBMIT KEYS',`Keys submitted successfully`,_uid);
                            return Response.success(Constants.API_KEY_SUCCESS,_data);
                        }
                        else{
                            BotMonitor.log('SUBMIT KEYS: saving',`Failed to submit keys`,_uid);
                            return Response.error(Constants.API_KEY_FAIL);
                        }
                    }
                    catch(e){
                        console.log(e);
                        BotMonitor.log('SUBMIT KEYS',`Failed to submit keys`,_uid);
                        return Response.error(Constants.DB_ERROR);
                    }                
                }
                catch(e){
                    console.log(e.code);
                    if (e.code == -2014){
                        console.log('2014')
                    }
                    BotMonitor.log('SUBMIT KEYS',`Failed to submit keys; api keys invalid`,_uid);
                    return Response.error(Constants.API_KEY_INVALID);
                }
            }
            else {
                return Response.error(Constants.KEY_EMPTY);
            }    
        }
    },
    generateOrderId : async () =>  Misc.generateOrderId
}


var getCandles = async (symbol) => {
    var _candles = await client.futuresCandles({ symbol: symbol, limit: 500, interval: config.botTimeFrame });

    return {
        all: _candles,
        lastCandle: _candles.slice(-1)[0],
        last3Candle: _candles.slice(-3)
    }
}

const _candlestick = {
    formatCandles: async (candles) => {
        if (candles.constructor.name.toLowerCase() == "array") {
            let _candles = {};
            _candles.volume = candles.map(x => x.volume);
            _candles.open = candles.map(x => x.open);
            _candles.close = candles.map(x => x.close);
            _candles.openTime = candles.map(x => x.openTime);
            _candles.closeTime = candles.map(x => x.closeTime);
            _candles.low = candles.map(x => x.low);
            return _candles;
        }
        else if (candles.constructor.name.toLowerCase() == "object") {
            return console.log("CANDLES ALREADY FORMATTED");
        }
        else {
            return console.log("ERROR FORMATTING CANDLES");
        }
    },
    engulfed: async (candles) => {
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
        if (currentDayHeight > previousDayHeight) {
            test.warn("TEST::  currentDayHeight is bigger than previous day");
            _confirmed = true;
        }
        else if (previousDayHeight > currentDayHeight) {
            test.warn("TEST:: previousDayHeight is bigger than current day");
            _confirmed = false;
        }
        else {
            test.warn("TEST:: checkmate?")
            _confirmed = false;
        }
        return _confirmed;
    },
    isBearish: async (candle) => {
        var openCandle = Number(candle['open']);
        var closeCandle = Number(candle['close']);
        return openCandle > closeCandle;
    },
    isBullish: async (candle) => {
        var openCandle = Number(candle['open']);
        var closeCandle = Number(candle['close']);
        return (closeCandle > openCandle && openCandle < closeCandle);
    },
    isBearishEngulfing: async (candles) => {
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
    isBullishEngulfing: async (candles) => {
        let currentDay = candles[1];
        let previousDay = candles[0];
        let _engulfed = await _candlestick.engulfed(candles);
        let isPreviousDayBearish = await _candlestick.isBearish(previousDay);
        let isCurrentDayBullish = await _candlestick.isBullish(currentDay);
        return isPreviousDayBearish && isCurrentDayBullish && _engulfed;
    },
    checkCandle: async (_candle) => {
        if (await _candlestick.isBearish(_candle)) {
            test.log("RED CANDLE");
        }
        else if (await _candlestick.isBullish(_candle)) {
            test.log("GREEN CANDLE");
        }
        else {
            test.log(".......")
        }
    }
}

var getSupports = async (_df) => {
    let df = {}, support, _supports = [];
    df.openTime = _df.map(x => x.openTime);
    df.closeTime = _df.map(x => x.closeTime);
    df.low = _df.map(x => x.low);
    //console.log(df)
    for (var i = 0; i < df.low.length; i++) {
        support = df['low'][i] < df['low'][i - 1] && df['low'][i] < df['low'][i + 1] && df['low'][i + 1] < df['low'][i + 2] && df['low'][i - 1] < df['low'][i - 2];
        support ? _supports.push({ p: df['low'][i], b: support, oT: df['openTime'][i], cT: df['closeTime'][i] }) : "";
    }
    return {
        supports: _supports,
        last_two: [
            _supports[_supports.length - 1],
            _supports[_supports.length - 2]
        ],
        two_support_away: _supports[_supports.length - 2],
        one_support_away: _supports[_supports.length - 1]
    }
}

var getResistance = async (_df) => {
    let df = {}, resistance, _resistance = [];
    df.openTime = _df.map(x => x.openTime);
    df.closeTime = _df.map(x => x.closeTime);
    df.high = _df.map(x => x.high);
    for (var i = 0; i < df.high.length; i++) {
        resistance = df['high'][i] > df['high'][i - 1] && df['high'][i] > df['high'][i + 1] && df['high'][i + 1] > df['high'][i + 2] && df['high'][i - 1] > df['high'][i - 2];
        resistance ? _resistance.push({ p: df['high'][i], b: resistance, oT: df['openTime'][i], cT: df['closeTime'][i] }) : "";
    }
    return {
        resistance: _resistance,
        last_two: [
            _resistance[_resistance.length - 1],
            _resistance[_resistance.length - 2]
        ],
        two_resistance_away: _resistance[_resistance.length - 2],
        one_resistance_away: _resistance[_resistance.length - 1]
    }
}

var calculateTpSl = async (side, supports, resistance, price) => {
    console.log("price : ", price);
    price = Number(price);
    if (side == 'BUY') {
        var takeProfit_A = resistance.resistance.reverse().find(o => Number(o['p']) > price);

        if (takeProfit_A > price) {
            takeProfit_A = Number(takeProfit_A.p)
        }
        else {
            console.log('Using TakeProfit Tweak');
            takeProfit_A = Number(price) + Number(config.tpslTweak);
        }

        console.log('TakeProfit Set At: : ,', takeProfit_A);

        var real_tp = takeProfit_A;
        var stopLoss_A = supports.two_support_away.p;

        if (stopLoss_A > price) {

            stopLoss_A = supports.supports.reverse().find(o => Number(o['p']) < price).p;
        }
        else {
            console.log('StopLoss b4 Tweak:  ', stopLoss_A);
            console.log('Using StopLoss Tweak');
            stopLoss_A = Number(price) - Number(config.tpslTweak);
        }
        var real_sl = Number(stopLoss_A);
        console.log('StopLoss Set At: : , ', stopLoss_A);
        return {
            tp: real_tp,
            sl: real_sl
        }

    }
    else if (side == 'SELL') {
        var takeProfit_A = supports.supports.reverse().find(o => Number(o['p']) < price);

        if (takeProfit_A < price) {
            takeProfit_A = Number(takeProfit_A.p)
        }
        else {
            console.log('Using takeProfit Tweak');
            takeProfit_A = Number(price) - Number(config.tpslTweak);
        }

        console.log('TakeProfit Set At: :  ', takeProfit_A);
        var real_tp = takeProfit_A;
        var stopLoss_A = resistance.two_resistance_away.p;

        if (stopLoss_A > price) {
            stopLoss_A = resistance.resistance.reverse().find(o => Number(o['p']) > price).p
        }
        else {
            console.log('StopLoss b4 Tweak:  ', stopLoss_A);
            console.log('Using StopLoss Tweak');
            stopLoss_A = Number(price) + Number(config.tpslTweak);
        }
        var real_sl = Number(stopLoss_A);
        console.log('StopLoss Set At: :  ', stopLoss_A);
        return {
            tp: real_tp,
            sl: real_sl
        }
    }

}

const strategy = {
    oneStream: async (authClient,symbol, id, _quantity, leverage, quantityPrecision,min) => {
        var signalFound = false;
        var quantity;
        var botStatus = (await Brain.user.botStatus(id)).data.status;
        if (botStatus){
            authClient.ws.futuresUser(async (x) => {
                var { symbol, eventType, orderStatus, clientOrderId, orderType, executionType, realizedProfit, positionSide } = x;
                if (eventType == 'ORDER_TRADE_UPDATE') {
                    test.log(x);
                    var botStatus = (await Brain.user.botStatus(id)).data.status;
                    console.log(botStatus);
                    var isStrategyOne = clientOrderId.includes('rxOne');
                    if (orderStatus == 'FILLED' && orderType == 'MARKET' && executionType == 'TRADE' && realizedProfit == '0' && isStrategyOne && botStatus == true) {
                        test.log("================================================================");
                        test.log('x:: ', x, '\n _____________________');
                        test.log(orderStatus, " |X| ", orderType);
                        var _side;
                        var _orderInfo = await Brain.getOrder(clientOrderId);
                        test.log("Corresponding info ::>> ", _orderInfo);
                        var priceLastTrade = x.priceLastTrade;
                        var { side, customId, quantity } = _orderInfo.data.order;
                        test.log("priceLast> ", x.priceLastTrade);

                        if (side == 'BUY') {
                            _side = 'SELL';
                        }
                        else {
                            _side = 'BUY';
                        }
                        var tsOrder = await authClient.order({
                            symbol: symbol,
                            side:  _side,
                            quantity: quantity,
                            type: 'TRAILING_STOP_MARKET',
                            positionSide : positionSide,
                            price : priceLastTrade,
                            callbackRate : '0.3',
                            newClientOrderId: customId + 'ts'
                        });
                    }
                }
            })
            return new Promise(async (resolve, reject) => {
                var _firstCandles = await getCandles(symbol);
                var lastCandles = _firstCandles.last3Candle;

                api.stream.kline({ symbol: symbol, interval: '1m' }, async (data) => {
                    test.log(`final? : ${data.kline.final}`);
                    //await cancelExistingOrder(symbol,data.kline.close);
                    _candle = data.kline;
                    if (data.kline.final) {

                        if (await _candlestick.isBearish(_candle)) {
                            test.log("RED CANDLE");
                        }
                        else if (await _candlestick.isBullish(_candle)) {
                            test.log("GREEN CANDLE");
                        }
                        else {
                            test.log(".......")
                        }
                        if (lastCandles.length == 3) {
                            lastCandles.shift();
                        }
                        lastCandles.push(_candle);
                        botStatus = (await Brain.user.botStatus(id)).data.status;
                        signalFound = false;
                    }
                    let last_two = lastCandles.slice(-2,);
                    //get support levels from candle data
                    var supports = await getSupports(_firstCandles.all);
                    //get resistance levels from candlesticks
                    var resistance = await getResistance(_firstCandles.all);
                    var isBullE = await _candlestick.isBullishEngulfing(last_two);
                    var isBearE = await _candlestick.isBearishEngulfing(last_two);

                    var _currentClosePrice = Number(data.kline.close).toFixed(3);
                    test.log(isBullE, " : ", isBearE);
                    let authInfo = await authClient.futuresAccountInfo();
                    var availableBalance = await authInfo.availableBalance;
                    let quant = (config.marginPercent *2* availableBalance) * leverage;
                    /*qUANTITY*/
                    quantity = (quantity/ _currentClosePrice);
                    test.log(quantity);
                    if (isBullE && botStatus == true) {
                        //BUY POSITION
                        var _side = 'BUY';
                        var _positionSide = 'LONG';
                        if (signalFound == false) {

                            BotMonitor.log('First Strategy - BUY',`Bullish Engulfing found `,id);
                            
                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

                            test.log(_customId);

                            signalFound = true;
                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by : id,
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            var newOrder = await authClient.order({
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                type: 'MARKET',
                                newClientOrderId: _customId,
                                positionSide: _positionSide
                            });
                        }
                    }
                    else if (isBearE && botStatus == true) {
                        if (signalFound == false) {
                            var _side = 'SELL';
                            var _positionSide = 'SHORT'
                            BotMonitor.log('Strategy One - SELL',`Bearish Engulfing found`,id);
                    
                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

                            test.log(_customId);

                            signalFound = true;

                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by : id,
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            var newOrder = await authClient.order({
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                type: 'MARKET',
                                newClientOrderId: _customId,
                                positionSide: _positionSide
                            });
                        }
                    }
                    else {
                        console.log(`Nothing here::: joyce will keep checking`)
                    }
                });
                resolve(true);
            });
        }
        else{
            resolve(false);
        }
    },
    twoStream: async (authClient,symbol, id, _quantity, leverage, quantityPrecision,min) => {
        var botStatus = (await Brain.user.botStatus(id)).data.status;
        var quantity;
        if (botStatus){
            authClient.ws.futuresUser(async (x) => {
                var { symbol, eventType, orderStatus, clientOrderId, orderType, executionType, realizedProfit, positionSide, priceLastTrade } = x;
                if (eventType == 'ORDER_TRADE_UPDATE') {
                    var isStrategyTwo = clientOrderId.includes('rxTwo');
                    var botStatus = (await Brain.user.botStatus(id)).data.status;
                    if (orderStatus == 'FILLED' && orderType == 'MARKET' && executionType == 'TRADE' && realizedProfit == '0' && isStrategyTwo && botStatus == true) {
                        test.log("================================================================");
                        test.log('x:: ', x, '\n _____________________');
                        test.log(orderStatus, " |X| ", orderType);
                        var _side;
                        var _orderInfo = await Brain.getOrder(clientOrderId);
                        test.log("Corresponding info ::>> ", _orderInfo);
                        var { side, customId, quantity } = _orderInfo.data.order;

                        if (side == 'BUY') {
                            _side = 'SELL';
                        }
                        else {
                            _side = 'BUY';
                        };
                        test.log("priceLast> ", x.priceLastTrade);
                        var tsOrder = await authClient.order({
                            symbol: symbol,
                            side: _side,
                            quantity: quantity,
                            type: 'TRAILING_STOP_MARKET',
                            positionSide: positionSide,
                            price: priceLastTrade,
                            callbackRate: '0.3',
                            newClientOrderId: customId + 'ts'
                        });
                        test.log(tsOrder);
                    }
                }
            })
            return new Promise(async (resolve, reject) => {
                var _firstCandles = await getCandles(symbol);
                var prices = _firstCandles.all.map(o => { return { close: Number(o['close']), time: o['closeTime'] } });

                let signalFound = false;
                var sp = symbol.split('USDT');

                var _symbol = `${sp[0]}/USDT`;
                var lastCandles = _firstCandles.last3Candle;
                api.stream.kline({ symbol: symbol, interval: config.botTimeFrame }, async (data) => {
                    /*
                    test.log(`final? : ${data.kline.final}`);    
                    */
                    let emaData = await ema(10, "close", "binance", _symbol, "1m", true);
                    let emaData50 = await ema(50, "close", "binance", _symbol, "1m", true);
                
                    let _10 = emaData.reverse()[0];
                    let _50 = emaData50.reverse()[0];
                    test.log('10::: ', _10);
                    test.log('50::: ', _50);
                    var _upSignal, _downSignal;
                    if (_10 == _50) {
                        test.log('equal');
                    }
                    test.log(_10);
                    test.log(_50);
                    _upSignal = (_10 > _50) ? true : false;
                    _downSignal = (_10 < _50) ? true : false;

                    if (_upSignal) {
                        test.log("greater");
                    }
                    if (_downSignal) {
                        test.log('lesser');
                    }
                    //*
                    //var _upSignal = await alerts.goldenCross(10, 50, 'binance', _symbol, '1m', true)
                    test.log('a> ', _upSignal);
                    //var _downSignal = await alerts.deathCross(10, 50, 'binance', _symbol, '1m', true)
                    test.log('b', _downSignal)

                    _candle = data.kline;
                    if (data.kline.final) {

                        if (await _candlestick.isBearish(_candle)) {
                            test.log("RED CANDLE");
                        }
                        else if (await _candlestick.isBullish(_candle)) {
                            test.log("GREEN CANDLE");
                        }
                        else {
                            test.log(".......")
                        }
                        if (lastCandles.length == 3) {
                            lastCandles.shift();
                        }
                        botStatus = (await Brain.user.botStatus(id)).data.status;
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
                    test.log(isBullE, " : ", isBearE);

                    /*qUANTITY*/
                    quantity = (_quantity/ _currentClosePrice);
                    var qt = quantity.toString().split('.');
                    var qt1 = qt[0];
                    var qt2 = qt[1];
                    qt2 = qt2.slice(0,1);
                    var _qt = `${qt1}.${qt2}`;
                    _qt = Number(_qt);
                    quantity = _qt;
                    test.log(_qt);
                    test.log(Number(_qt));
                    test.log(quantity);

                    if (isBullE && _upSignal && botStatus == true) {
                        //BUY POSITION
                        var _side = 'BUY';
                        var _positionSide = 'LONG';
                        if (signalFound == false) {

                            BotMonitor.log('Second Strategy - BUY',`Bullish Engulfing & GCross found `,id);
                            test.log(supports.last_two);

                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

                            test.log(_customId);

                            signalFound = true;
                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by : id,
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            var newOrder = await authClient.order({
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                type: 'MARKET',
                                newClientOrderId: _customId,
                                positionSide: _positionSide
                            });
                        }
                    }
                    else if (isBearE && _downSignal && botStatus == true) {
                        if (signalFound == false) {
                            var _side = 'SELL';
                            var _positionSide = 'SHORT';
                            BotMonitor.log('Second Strategy - SELL',`Bearish Engulfing found`,id)
                            
                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

                            signalFound = true;
                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by : id,
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            var newOrder = await authClient.order({
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                type: 'MARKET',
                                newClientOrderId: _customId,
                                positionSide: _positionSide
                            });
                        }
                    }
                    else {
                        BotMonitor.log('STRATEGY CHECK',`=--------=`,id);
                        test.log(`Nothing here::: joyce will keep checking`)
                    }
                    resolve(data);
                })
                resolve(true);
            })
        }
        else{
            resolve(false);
        }
    }
}

class strategies {
    constructor(authClient,symbol, id, quantity,leverage,quantityPrecision,min) {
        this.symbol = symbol;
        this.id = id;
        this.quantity = quantity;
        this.authClient = authClient;
        this.leverage = leverage;
        this.min = min;
        this.quantityPrecision = quantityPrecision;
    }
    strategyOne() {
        strategy.oneStream(this.authClient,this.symbol, this.id, this.quantity,this.leverage, this.quantityPrecision,this.min);
    }
    strategyTwo() {
        strategy.twoStream(this.authClient,this.symbol, this.id, this.quantity, this.leverage,this.quantityPrecision,this.min);
    }
}
/*
    var init = new strategies('BNBUSDT', 'd44r874', '0.05');
    init.strategyTwo();
*/
const Bot = {
    start : async (auth,symbol,id,quantity,strategy,leverage,quantityPrecision,min) => {
        var authClient = Binance(auth);
        //console.log(auth);
        strategy = Number(strategy);
        test.log(strategy);
        var _req = await User.updateOne({_uid : id}, {$set:{botStatus : true}});
        if(_req){
            if(strategy == 1){
                var init = new strategies(authClient,symbol,id,quantity,leverage,quantityPrecision,min);
                //var init = new strategies('BNBUSDT', 'd44r874', '0.05');
                init.strategyOne();
            }
            else if (strategy == 2){
                var init = new strategies(authClient,symbol,id,quantity, leverage, quantityPrecision,min);
                init.strategyTwo();
            }
            BotMonitor.log('BOT STOP',`Bot started successfully on strategy-${strategy}`,id);
            return Response.success(Constants.BOT_START_SUCCESS);
            //console.log(quantity);
            //console.log(strategy,' | ',symbol,' | ',id,' | ',auth,' | ',quantity);
        }
        else {
            BotMonitor.log('BOT START','Bot failed to start',id);
            return Response.error(Constants.BOT_START_FAIL);
        }
    },
    stop : async (id) =>{
        try{
            var _req = await User.updateOne({_uid : id}, {$set:{botStatus : false}});
            if(_req){
                BotMonitor.log('BOT STOP','Bot stopped successfully',id);
                return Response.success(Constants.BOT_STOP_SUCCESS);
            }
            else {
                BotMonitor.log('BOT STOP','Bot failed to stop',id);
                return Response.error(Constants.BOT_STOP_FAIL);
            }
        }
        catch(e){
            BotMonitor.log('BOT STOP','Database connection error',id);
            return Response.error(Constants.DB_ERROR,Constants.BOT_STOP_FAIL);
        }
    }
}

exports.Brain = Brain;