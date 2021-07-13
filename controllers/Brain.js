const { Response } = require("./misc/Response");
require('dotenv').config();
var mongoose = require('mongoose');
const { config } = require("../config");
const crypt = require("crypto");
const { Constants } = require("./misc/Constants");
const { Misc } = require("./misc/Misc");

const Binance = require("binance-api-node").default;
const client = Binance();
var api = require('@marcius-capital/binance-api');

const _EMA = require("@aduryagin/technical-indicators").EMA;
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
    login: async (body) => {
        var { email, password } = body;
        console.log(email)
        var _req = await User.findOne({ email: email });
        if (_req == null) {
            return Response.error(Constants.LOGIN_FAILED);
        }
        else {
            password = await Misc.hashPassword(password);
            if (_req.password == password) {
                return Response.success(Constants.LOGIN_SUCCESS, _req);
            }
            else {
                return Response.error(Constants.LOGIN_FAILED);
            }
        }
    },
    onboard: async (user) => {
        var { email, password, code } = user;
        user.password = await Misc.hashPassword(password);
        user._uid = await Misc.generateId();
        user.subscribed = false;
        code ? code : "518a8go";
        var _codeReq = await User.findOne({ _uid: code });
        if (_codeReq == null) {
            return Response.error(Constants.REFERRAL_CODE_INVALID);
        }
        else {
            user.referredBy = code;
            user.paidReferrals = 0;
            user.unpaidReferrals = 0;
            var _req = await User.findOne({ email: email });
            if (_req == null) {
                try {
                    var _user = new User(user);
                    await _user.save();
                    try {
                        var _up = await User.updateOne({ _uid: code }, { $inc: { unpaidReferrals: 1 } });
                        BotMonitor.log("ONBOARD", `Updating unpaid referrals for ${code}`, "bot");
                    }
                    catch (e) {
                        BotMonitor.error("ONBOARD", `Error updating referrals for ${code}`);
                    }
                    BotMonitor.log("ONBOARD", `New signup by ${user.email} referred by ${code}:(${_codeReq.email})`, "bot");
                    return Response.success(Constants.SIGNUP_SUCCESS, user);
                }
                catch (e) {
                    BotMonitor.error("ONBOARD:", `DB error when onboarding ${user.email}`, user._uid)
                    return Response.error(Constants.DB_ERROR);
                }
            }
            else {
                return Response.error(Constants.EMAIL_EXISTS)
            }
        }
    },
    saveOrder: async (order) => {
        var _order = new Order(order);
        try {
            await _order.save();
            return true
        }
        catch (e) {
            console.log("JOYCE.SAVEORDER  :", e);
            return false
        }
    },
    getOrder: async (id) => {
        try {
            var _req = await Order.findOne({ customId: id });
            //console.log("id: ", id);
            if (_req == null) {
                return Response.error(Constants.DATA_EMPTY);
            }
            else {

                return Response.success(Constants.DATA_RETRIEVE_SUCCESS, { order: _req })
            }
        }
        catch (e) {
            console.log(e)
            return Response.error()
        }
    },
    checkOrder: async (symbol, price) => {
        console.log(symbol)
        price = price.toString()
        var _check = await Order.find({ symbol: symbol, $or: [{ takeProfitPrice: price }, { stopLossPrice: price }] });
        console.log(_check)
        if (_check.length > 0) {
            return Response.success(true, _check);
        }
        else {
            return Response.error();
        }
    },
    getSymbolInfo: async (symbol) => {
        try {
            var ex = await client.futuresExchangeInfo();
            //console.log(ex)
            var filtered = ex.symbols.map(o => { return { baseAsset: o.baseAsset, pair: o.pair, filters: o.filters, quantityPrecision: o.quantityPrecision } });
            //console.log(filtered);
            return Response.success(Constants.DATA_RETRIEVE_SUCCESS, filtered);
        }
        catch (e) {
            console.log(e);
            return Response.error();
        }
    },
    getLeverage: async (user, symbol) => {
        try {
            //console.log(user);
            var _config = {
                apiSecret: user.binanceApiSecret,
                apiKey: user.binanceApiKey
            }
            var _client = Binance(_config)
            var lev = await _client.futuresLeverageBracket({ symbol: symbol });
            return Response.success(Constants.DATA_RETRIEVE_SUCCESS, lev);
        }
        catch (e) {
            BotMonitor.log('Get Leverage Error', e.message, user._uid);
            return Response.error(Constants.ERROR_FETCHING_DATA, e.message);
        }
    },
    user: {
        withdrawRefer: async (user) => {
            try {
                //console.log(user);
                var _config = {
                    apiSecret: user.binanceApiSecret,
                    apiKey: user.binanceApiKey
                }

                try {
                    var _client = Binance(_config)
                    var _add = await _client.depositAddress({ coin: config.defaultPayCoin, network: 'BSC' });
                    var _upd = await User.updateOne({ _uid: user._uid }, { $inc: { paidReferrals: user.unpaidReferrals, unpaidReferrals: -Number(user.unpaidReferrals) }, $set: { unpaidReferrals: 0 } });
                    if (_upd.ok) {
                        //send email
                        BotMonitor.log('Referral WIthdrawal', `by ${user.email}: ${user.unpaidReferrals}`, user._uid);
                        var emailSend = await Misc.sendWithdrawMail(_add.address, user.email, user._uid, user.unpaidReferrals, _add.url);
                        return Response.success(Constants.DATA_RETRIEVE_SUCCESS, _add);
                    }
                    else {
                        BotMonitor.log('Referral WIthdrawal Error', `by ${user.email}: ${user.unpaidReferrals}`, user._uid);
                        return Response.error(Constants.DB_ERROR);
                    }
                }
                catch (e) {
                    BotMonitor.log('WithdrawError', e.message, user._uid);
                    return Response.error(e.message);

                }
            }
            catch (e) {
                BotMonitor.log('WithdrawError', e.message, id);
                return Response.error(Constants.ERROR_FETCHING_DATA, e.message);
            }
        },
        pay: async (user, data) => {
            var { subType, address } = data;
            subType = Number(subType);
            var subAmount;
            if (subType == 1 || subType == 2) {
                var subExpire;
                try {
                    var _config = {
                        apiSecret: user.binanceApiSecret,
                        apiKey: user.binanceApiKey
                    };
                    //console.log(subType)
                    if (subType == 1) {
                        subAmount = config.oneWeek;
                        subExpire = new Date(new Date().setDate(new Date().getDate() + 7));
                    }
                    else {
                        subAmount = config.twoWeek;
                        subExpire = new Date(new Date().setDate(new Date().getDate() + 14));
                    }
                    //address = "0x5B0B812A5C13013152171F5c85A4eE983b4C2608";
                    //subAmount = 0.03420206;
                    //console.log(subAmount)
                    var _client = Binance(_config);
                    var hist = await _client.withdrawHistory({
                        coin: config.defaultPayCoin,
                    })
                    //console.log(hist);
                    //console.log(address);
                    var _payData = hist.find(o => o.address == address);
                    // console.log(_payData);
                    if (_payData) {
                        if (Math.round(_payData.amount) == Math.round(subAmount)) {
                            var { applyTime } = _payData;
                            applyTime = new Date(applyTime);
                            var now = new Date();
                            var diff = now - applyTime;
                            var _diff = Math.round((diff / (60 * 60 * 24 * 1000)) % 365);
                            if (_diff <= config.limitDayPay) {
                                try {
                                    var _req = await User.updateOne({ _uid: user._uid }, { $set: { subscribed: true, subType: subType, subTime: new Date(), subExpire: subExpire } });;
                                    if (_req.ok == 1) {
                                        BotMonitor.log("SUBSCRIPTION", `$${subAmount} plan`, user._uid);
                                        return Response.success("Payment confirmed");
                                    }
                                }
                                catch (e) {
                                    BotMonitor.log("SUBSCRIPTION", 'Error saving info', user._uid);
                                    return Response.error(Constants.DB_ERROR);
                                }
                            }
                            else {
                                BotMonitor.log("SUBSCRIPTION:[Payment wasnt found; but others were]", _payData, user._uid);
                                return Response.error(`No payment received within the last ${config.limitDayPay} days`);
                            }
                        }
                        else {
                            BotMonitor.log("SUBSCRIPTION", 'Payment not received', user._uid);
                            return Response.error(`Payment not received for $${subAmount} plan`);
                        }
                    }
                    else {
                        return Response.error('Payment not received');
                    }
                }
                catch (e) {
                    var msg;
                    BotMonitor.log("PAYMENT", e, user._uid);
                    if (e.code == -1002) {
                        msg = "Please enable withdrawals with your Binance api key";
                    }
                    return Response.error(`${Constants.SUB_FAIL}:${e.message}`, [msg, `${e.code}: ${e.message}`]);
                }
            }
            else {
                return Response.error(Constants.INVALID_FIELD)
            }
        },
        getDepositAddress: async () => {
            var _config = {
                apiSecret: config.apiSecret,
                apiKey: config.apiKey
            };
            var _client = Binance(_config);
            try {
                var add = await _client.depositAddress({
                    coin: 'USDT',
                    network: 'BSC'
                })

                return Response.success('Address fetched.Please pay to it', add);
            }
            catch (e) {
                BotMonitor.log('GETDEPOSIT ADDRESS', e);
                BotMonitor.error('GETDEPOSIT ADDRESS', e);
                return Response.error('Error fetching address');
            }
        },
        getBinanceKeys: async (user) => {
            var _req = await User.findOne({ _uid: user });
            if (_req == null) {
                return Response.error(Constants.USER_NOT_FOUND);
            }
            else {
                var keys = {
                    binanceApiKey: _req.binanceApiKey,
                    binanceApiSecret: _req.binanceApiSecret
                }
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS, keys);
            }
        },
        getById: async (id) => {
            var _req = await User.findOne({ _uid: id });
            if (_req == null) {
                return Response.error(Constants.DATA_EMPTY);
            }
            else {
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS, _req);
            }
        },
        myOrders: async (data) => {
            var { _uid } = data;
            //console.log(_uid);
            try {
                var _req = await Order.find({ by: _uid });
                //console.log(_req);
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS, _req);
            }
            catch (e) {
                console.log(e);
                return Response.error(Constants.DB_ERROR);
            }
        },
        botStatus: async (_uid) => {
            var _req = await User.findOne({ _uid: _uid });
            if (_req == null) {
                return Response.error(Constants.USER_NOT_FOUND);
            }
            else {
                return Response.success(Constants.DATA_RETRIEVE_SUCCESS, _req)
            }
        },
        botOrder: async (user, data) => {
            var { strategy, leverage, symbol, minNotional, quantityPrecision } = data;
            var { binanceApiSecret, binanceApiKey, _uid } = user;
            if (binanceApiKey && binanceApiSecret) {
                let _bConfig = {
                    apiKey: binanceApiKey,
                    apiSecret: binanceApiSecret,
                    httpFutures: true,
                }
                try {
                    let authClient = Binance(_bConfig);
                    let authInfo = await authClient.futuresAccountInfo();
                    try {
                        var availableBalance = authInfo.availableBalance;
                        leverage ? leverage : leverage = config.defaultLeverage;
                        try {
                            var lev = await authClient.futuresLeverage({ symbol: symbol, leverage: leverage });
                            BotMonitor.log('Leverage Change', lev, _uid);
                            BotMonitor.log(`AvailableBalance`, availableBalance, _uid);
                            console.log(quantityPrecision);


                            let quant = (config.marginPercent * availableBalance) * leverage;
                            console.log(quant, '<|>', minNotional)
                            try {
                                if (quant >= minNotional) {
                                    console.log("Seeming alright");
                                    var st = await Bot.start(_bConfig, symbol, _uid, quant, strategy, leverage, quantityPrecision, minNotional);
                                    if (st) {
                                        return Response.success("seeming alright");
                                    }
                                    else {
                                        console.log("err");
                                        return Response.error("err");
                                    }
                                }
                                else {
                                    return Response.error(Constants.MARGIN_INSUFFICIENT)
                                }
                            }
                            catch (e) {
                                console.log(e);
                                return Response.error(Constants.BOT_START_FAIL);
                            }
                            /*
                            * qunatity => (10% of balance)* leverage
                            */
                            //console.log(authInfo);
                        }
                        catch (e) {
                            console.log(e);
                            return Response.error(Constants.LEVERAGE_SETUP_FAIL);
                        }
                    }
                    catch (e) {
                        console.log(e);
                        return Response.error(Constants.ERROR_FETCHING_DATA);
                    }
                }
                catch (e) {
                    console.log(e);
                    return Response.error(e.message, [e.code, e.message]);
                }
            }
            else {
                return Response.error(Constants.API_KEY_NOT_EXIST);
            }
        },
        stopBot: async (user) => {
            var { _uid } = user;
            var stop = await Bot.stop(_uid);
            return stop;
        },
        submitKeys: async (_uid, data) => {
            var { apiKey, apiSecret } = data;
            let _bConfig = {
                apiKey: apiKey,
                apiSecret: apiSecret,
                httpFutures: true,
            }
            if (apiSecret && apiKey) {
                try {
                    let authClient = Binance(_bConfig);

                    let authInfo = await authClient.futuresAccountInfo();
                    test.log('authIauthInfo> ', Object.keys(authInfo));
                    var _data = {
                        availableBalance: authInfo.availableBalance,
                        totalWalletBalance: authInfo.totalWalletBalance
                    }
                    try {
                        var saveKeys = await User.updateOne({ _uid: _uid }, { $set: { binanceApiKey: apiKey, binanceApiSecret: apiSecret } });
                        BotMonitor.log('SUBMIT KEYS: save', saveKeys, _uid);
                        if (saveKeys.ok == 1) {
                            BotMonitor.log('SUBMIT KEYS', `Keys submitted successfully`, _uid);
                            return Response.success(Constants.API_KEY_SUCCESS, _data);
                        }
                        else {
                            BotMonitor.log('SUBMIT KEYS: saving', `Failed to submit keys`, _uid);
                            return Response.error(Constants.API_KEY_FAIL);
                        }
                    }
                    catch (e) {
                        console.log(e);
                        BotMonitor.log('SUBMIT KEYS', `Failed to submit keys`, _uid);
                        return Response.error(Constants.DB_ERROR);
                    }
                }
                catch (e) {
                    console.log(e.code);
                    if (e.code == -2014) {
                        console.log('2014')
                    }
                    BotMonitor.log('SUBMIT KEYS', `Failed to submit keys; api keys invalid`, _uid);
                    return Response.error(Constants.API_KEY_INVALID);
                }
            }
            else {
                return Response.error(Constants.KEY_EMPTY);
            }
        }
    },
    generateOrderId: async () => Misc.generateOrderId
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
    oneStream: async (authClient, symbol, id, _quantity, leverage, quantityPrecision, min) => {
        var signalFound = false;
        var quantity;
        var botStatus = (await Brain.user.botStatus(id)).data.status;
        if (botStatus) {
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
                            side: _side,
                            quantity: quantity,
                            type: 'TRAILING_STOP_MARKET',
                            positionSide: positionSide,
                            price: priceLastTrade,
                            callbackRate: config.callbackRate,
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
                    let quant = (config.marginPercent * 2 * availableBalance) * leverage;
                    /*qUANTITY*/
                    console.log(quantityPrecision);
                    quantity = Number((_quantity / _currentClosePrice)).toFixed(quantityPrecision);
                    test.log(quantity);
                    if (isBullE && botStatus == true) {
                        //BUY POSITION
                        var _side = 'BUY';
                        var _positionSide = 'LONG';
                        if (signalFound == false) {

                            BotMonitor.log('First Strategy - BUY', `Bullish Engulfing found `, id);

                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

                            test.log(_customId);

                            signalFound = true;
                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by: id,
                                time: new Date(),
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
                            BotMonitor.log('Strategy One - SELL', `Bearish Engulfing found`, id);

                            var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

                            test.log(_customId);

                            signalFound = true;

                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by: id,
                                time: new Date(),
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
        else {
            resolve(false);
        }
    },
    twoStream: async (authClient, symbol, id, _quantity, leverage, quantityPrecision, min) => {
        let _api = require('@marcius-capital/binance-api');
        var _bot = (await Brain.user.botStatus(id)).data;
        var botStatus = _bot.botStatus;
        var botExpiry = _bot.subExpire;
        var botType = _bot.subType;
        var currentSym = _bot.currentSymbol;
        var quantity;
        console.log(botStatus)
        var isBotExpired = await Misc.isBotExpired(botExpiry, botType);
        if (botStatus) {
            authClient.ws.futuresUser(async (x) => {
                var { symbol, eventType, orderStatus, clientOrderId, orderType, executionType, realizedProfit, positionSide, priceLastTrade } = x;
                if (eventType == 'ORDER_TRADE_UPDATE') {
                    var isStrategyTwo = clientOrderId.includes('rxTwo');
                    var _bot = (await Brain.user.botStatus(id)).data;
                    var botStatus = _bot.botStatus;
                    if (orderStatus == 'FILLED' && orderType == 'MARKET' && executionType == 'TRADE' && realizedProfit == '0' && isStrategyTwo && botStatus == true) {
                        test.log("================================================================");
                        test.log('x:: ', x, '\n _____________________');
                        test.log(orderStatus, " |X| ", orderType);
                        var _side;
                        var _orderInfo = await Brain.getOrder(clientOrderId);
                        test.log("Corresponding info ::>> ", _orderInfo);
                        var { side, customId, quantity,takeProfitPrice, stopLossPrice } = _orderInfo.data.order;

                        if (side == 'BUY') {
                            _side = 'SELL';
                        }
                        else {
                            _side = 'BUY';
                        };
                        test.log("priceLast> ", x.priceLastTrade);
                        try {
                            var tpOrder = await authClient.order({
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                type: 'TAKE_PROFIT',
                                price: priceLastTrade,
                                stopPrice: Number(takeProfitPrice),
                                timeInForce: 'IOC',
                                positionSide: positionSide,
                                newClientOrderId:  `${customId}tp`
                            });
                            try {
                                var slOrder = await authClient.order({
                                    symbol: symbol,
                                    side: _side,
                                    quantity: quantity,
                                    type: 'STOP',
                                    price: priceLastTrade,
                                    positionSide: positionSide,
                                    timeInForce: 'IOC',
                                    stopPrice: Number(stopLossPrice),
                                    newClientOrderId:  `${customId}sl`
                                });
                            }
                            catch (e) {
                                var cancel = await authClient.futuresCancelOrder({
                                    symbol: symbol,
                                    origClientOrderId: customId
                                });
                                var cancel2 = await authClient.futuresCancelOrder({
                                    symbol: symbol,
                                    origClientOrderId: `${customId}sl`
                                })
                                BotMonitor.log("SELL ORDER ERROR",e.message,id);
                                console.log(e);
                            }
                        }
                        catch (e) {
                            var cancel = await authClient.futuresCancelOrder({
                                symbol: symbol,
                                origClientOrderId: customId
                            })
                            BotMonitor.log("TAKE ORDER ERROR",e,id);
                        }
                        //test.log(tsOrder);
                    }
                    if (executionType == 'EXPIRED') {
                        var { symbol, orderType, clientOrderId } = x;
                        if (orderType == 'TAKE_PROFIT') {
                            var cl_id = clientOrderId.split("tp")[0];
                            
                            var ts_id = `${cl_id}sl`;
                            try{
                                var cancel = await authClient.futuresCancelOrder({
                                    symbol: symbol,
                                    origClientOrderId: ts_id
                                })
                                BotMonitor.log('TakeProfit Cancel',cl_id,id);
                            }
                            catch(e){
                                BotMonitor.log('TakeProfit Cancel Error',e,`${id}:::${ts_id}`);
                            }
                        }
                        else if (orderType == 'STOP') {
                            var cl_id = clientOrderId.split("sl")[0];
                            var tp_id = `${cl_id}tp`;
                            try{
                                var cancel = await authClient.futuresCancelOrder({
                                    symbol: symbol,
                                    origClientOrderId: tp_id
                                })
                                BotMonitor.log('STOP LOSS Cancel',e,`${id}:::${tp_id}`);
                            }
                            catch(e){
                                BotMonitor.log('STOP LOSS Cancel Error',e,`${id}:::${tp_id}`);
                            }
                        }
                        else {
                            console.log("-_-")
                        }
                    }
                }
            })
            return new Promise(async (resolve, reject) => {
                var _firstCandles = await getCandles(symbol);
                var prices = _firstCandles.all.map(o => { return { close: Number(o['close']), time: o['closeTime'] } });

                var _prices = await _firstCandles.all.map(o => { return Number(o['close']) });
                var candles = prices;
                var period = 10;
                var _ema10 = _EMA({ candles, period });
                period = 50;
                var _ema50 = _EMA({ candles, period });

                var sp = symbol.split('USDT');

                var _symbol = `${sp[0]}/USDT`;
                var lastCandles = _firstCandles.last3Candle;
                var currentEma10 = await _ema10.result().slice(-1)[0].value;
                var currentEma50 = await _ema50.result().slice(-1)[0].value;
                var crossUp = false; var crossDown = false;

                if (currentEma10 > currentEma50) {
                    crossUp = true;
                }
                if (currentEma10 < currentEma50) {
                    crossDown = true;
                }
                var crossDownTwo = false;
                var crossUpTwo = false;
                var bought = false;
                _api.stream.kline({ symbol: currentSym, interval: config.botTimeFrame }, async (data) => {
                    var _10 = _ema10.update({ close: data.kline['close'], time: data.kline['closeTime'] }).value;
                    var _50 = _ema50.update({ close: data.kline['close'], time: data.kline['closeTime'] }).value;

                    if (_10 > _50 && crossDown) {
                        crossUpTwo = true;
                        crossDownTwo = false;
                        crossUp = true;
                        crossDown = false;
                        bought = false;
                        console.log("10 above 50 now");
                    }
                    else if (_10 < _50 && crossUp) {
                        crossDownTwo = true;
                        crossUpTwo = false;
                        crossUp = false;
                        crossDown = true;
                        bought = false;
                        console.log("10 below 50 now");
                    }
                    let last_two = lastCandles.slice(-2,);

                    var isBullE = await _candlestick.isBullishEngulfing(last_two);
                    var isBearE = await _candlestick.isBearishEngulfing(last_two);
                    var _currentClosePrice = Number(last_two[1]['close']);
                    test.log(isBullE, " : ", isBearE);

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

                        var _bot = (await Brain.user.botStatus(id)).data;
                        var botStatus = _bot.botStatus;
                        botExpiry = _bot.subExpire;
                        botType = _bot.subType;
                        isBotExpired = await Misc.isBotExpired(botExpiry, botType);
                        currentSym = await _bot.currentSymbol;
                        lastCandles.push(_candle);
                    }

                    var ccp = data.kline['close'];
                    var cct = data.kline['closeTime'];
                    /*qUANTITY*/
                    //console.log(quantityPrecision);
                    quantity = Number((_quantity / ccp)).toFixed(quantityPrecision);
                    //console.log(quantity)

                    if ( botStatus == true && !isBotExpired) {
                        if (isBearE && crossDownTwo == true && bought == false ) {
                            console.log("....Lets sell ......");
                            bought = true;
                            console.log(leverage);
                            var _side = 'SELL';
                            var _positionSide = 'SHORT';
                            BotMonitor.log('Second Strategy - SELL', `Bearish Engulfing found`, id)

                            var _customId = await Misc.generateOrderId(id, symbol, cct, 2);

                            var sl = Math.abs(Number((config.slPercent * ccp) / (100 * leverage)) + Number(ccp)).toFixed(3);
                            var tp = Math.abs(Number((config.tpPercent * ccp) / (100 * leverage)) - Number(ccp)).toFixed(3);


                            console.log("StopLoss: ", sl);
                            console.log("Takeprofit: ", tp);

                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                takeProfitPrice: Number(tp),
                                stopLossPrice: Number(sl),
                                by: id,
                                time: new Date(),
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            try {
                                var newOrder = await authClient.order({
                                    symbol: symbol,
                                    side: _side,
                                    quantity: quantity,
                                    type: 'MARKET',
                                    newClientOrderId: _customId,
                                    positionSide: _positionSide
                                });
                            }
                            catch (e) {
                                BotMonitor.log('ORDER ERROR', e, id)
                            }
                            console.log(`\n - \n - \n - \n We should SELL \n - \n - \n - \n TakeProfit : ${tp} \n StopLoss : ${sl} \n ++++++++++++++++`);
                        }
                    }
                    if (botStatus == true && !isBotExpired) {
                        if (isBullE && crossUpTwo == true && bought == false ) {
                            console.log("......Lets buy....");
                            bought = true;
                            _side = 'BUY';
                            _positionSide = 'LONG';
                            var tp = Math.abs(Number((config.tpPercent * ccp) / (100 * leverage)) + Number(ccp)).toFixed(3);
                            var sl = Math.abs(Number((config.slPercent * ccp) / (100 * leverage)) - Number(ccp)).toFixed(3);
                            BotMonitor.log('Second Strategy - BUY', `Bullish Engulfing & GCross found `, id);
                            //test.log(supports.last_two);

                            var _customId = await Misc.generateOrderId(id, symbol, cct, 2);

                            test.log(_customId);;
                            console.log("StopLoss: ", sl);
                            console.log("Takeprofit: ", tp);
                            signalFound = true;
                            var _order = {
                                symbol: symbol,
                                side: _side,
                                quantity: quantity,
                                customId: _customId,
                                by: id,
                                takeProfitPrice: tp,
                                stopLossPrice: sl,
                                time: new Date(),
                                positionSide: _positionSide
                            }
                            await Brain.saveOrder(_order);
                            try {
                                var newOrder = await authClient.order({
                                    symbol: symbol,
                                    side: _side,
                                    quantity: quantity,
                                    type: 'MARKET',
                                    newClientOrderId: _customId,
                                    positionSide: _positionSide
                                });
                            }
                            catch (e) {
                                BotMonitor.log('ORDER ERROR', e, id)

                            }

                        }
                    }
                    else {
                        BotMonitor.log("STRATEGY CHECK","2",id)
                    }
                })
                resolve();
            })
        }
        else {
            resolve(false);
        }
    }
}

class strategies {
    constructor(authClient, symbol, id, quantity, leverage, quantityPrecision, min) {
        this.symbol = symbol;
        this.id = id;
        this.quantity = quantity;
        this.authClient = authClient;
        this.leverage = leverage;
        this.min = min;
        this.quantityPrecision = quantityPrecision;
    }
    strategyOne() {
        strategy.oneStream(this.authClient, this.symbol, this.id, this.quantity, this.leverage, this.quantityPrecision, this.min);
    }
    strategyTwo() {
        strategy.twoStream(this.authClient, this.symbol, this.id, this.quantity, this.leverage, this.quantityPrecision, this.min);
    }
}
/*
    var init = new strategies('BNBUSDT', 'd44r874', '0.05');
    init.strategyTwo();
*/
const Bot = {
    start: async (auth, symbol, id, quantity, strategy, leverage, quantityPrecision, min) => {
        var authClient = Binance(auth);
        //console.log(auth);
        strategy = Number(strategy);
        test.log(strategy);
        var _req = await User.updateOne({ _uid: id }, { $set: { botStatus: true, currentSymbol: symbol } });
        if (_req) {
            if (strategy == 1) {
                var init = new strategies(authClient, symbol, id, quantity, leverage, quantityPrecision, min);
                //var init = new strategies('BNBUSDT', 'd44r874', '0.05');
                init.strategyOne();
            }
            else if (strategy == 2) {
                var init = new strategies(authClient, symbol, id, quantity, leverage, quantityPrecision, min);
                init.strategyTwo();
            }
            BotMonitor.log('BOT START', `Bot started successfully on strategy-${strategy}`, id);
            return Response.success(Constants.BOT_START_SUCCESS);
            //console.log(quantity);
            //console.log(strategy,' | ',symbol,' | ',id,' | ',auth,' | ',quantity);
        }
        else {
            BotMonitor.log('BOT START', 'Bot failed to start', id);
            return Response.error(Constants.BOT_START_FAIL);
        }
    },
    stop: async (id) => {
        try {
            var _req = await User.updateOne({ _uid: id }, { $set: { botStatus: false } });
            if (_req) {
                BotMonitor.log('BOT STOP', 'Bot stopped successfully', id);
                return Response.success(Constants.BOT_STOP_SUCCESS);
            }
            else {
                BotMonitor.log('BOT STOP', 'Bot failed to stop', id);
                return Response.error(Constants.BOT_STOP_FAIL);
            }
        }
        catch (e) {
            BotMonitor.log('BOT STOP', 'Database connection error', id);
            return Response.error(Constants.DB_ERROR, Constants.BOT_STOP_FAIL);
        }
    }
}

exports.Brain = Brain;