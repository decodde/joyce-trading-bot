const api = require('@marcius-capital/binance-api');
const Binance = require("binance-api-node").default;

const ema = require('trading-indicator').ema
const alerts = require('trading-indicator').alerts;

const { testConsole: test } = require("../testConsole");
const client = Binance();
const { config } = require("../config");


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
    oneStream: async (authClient,symbol, id, quantity) => {
        var signalFound = false;
        var botStatus = (await Brain.user.botStatus(id)).data.status;
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

                /*qUANTITY*/
                quantity = (_currentClosePrice / quantity);
                console.log(quantity);
                if (isBullE && botStatus == true) {
                    //BUY POSITION
                    var _side = 'BUY';
                    var _positionSide = 'LONG';
                    if (signalFound == false) {

                        console.log(`Bullish Engulfing found `)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`);
                        
                        var _customId = await Brain.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

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
                        console.log(`Bearish Engulfing found`)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`);

                        var _customId = await Brain.generateOrderId(id, symbol, last_two[1]['closeTime'], 1);

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
                resolve(data);
            });
        });
    },
    twoStream: async (authClient,symbol, id, quantity) => {
        var botStatus = (await Brain.user.botStatus(id)).data.status;
        authClient.ws.futuresUser(async (x) => {
            var { symbol, eventType, orderStatus, clientOrderId, orderType, executionType, realizedProfit, positionSide, priceLastTrade } = x;
            if (eventType == 'ORDER_TRADE_UPDATE') {
                var isStrategyTwo = clientOrderId.includes('rxTwo');
                var botStatus = (await Brain.user.botStatus(id)).data.status;
                if (orderStatus == 'FILLED' && orderType == 'MARKET' && executionType == 'TRADE' && realizedProfit == '0' && isStrategyTwo && botStatus == true) {
                    console.log("================================================================");
                    test.log('x:: ', x, '\n _____________________');
                    test.log(orderStatus, " |X| ", orderType);
                    var _side;
                    var _orderInfo = await Brain.getOrder(clientOrderId);
                    console.log("Corresponding info ::>> ", _orderInfo);
                    var { side, customId, quantity } = _orderInfo.data.order;

                    if (side == 'BUY') {
                        _side = 'SELL';
                    }
                    else {
                        _side = 'BUY';
                    };
                    console.log("priceLast> ", x.priceLastTrade);
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
                console.log('10::: ', _10);
                console.log('50::: ', _50);
                var _upSignal, _downSignal;
                if (_10 == _50) {
                    console.log('equal');
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
                quantity = (_currentClosePrice / quantity);
                console.log(quantity);

                if (isBullE && _upSignal && botStatus == true) {
                    //BUY POSITION
                    var _side = 'BUY';
                    var _positionSide = 'LONG';
                    if (signalFound == false) {

                        console.log(`Bullish Engulfing & GCross found `)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        test.log(supports.last_two);

                        var _customId = await Brain.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

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
                        console.log(`Bearish Engulfing found`)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        console.log(supports.last_two);
                        console.log(`Two resistance points away::`, resistance.two_resistance_away);
                        var _customId = await Brain.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

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
                        console.log(newOrder);
                    }
                }
                else {
                    console.log(`Nothing here::: joyce will keep checking`)
                }
                resolve(data);
            })
        })
    }
}

class strategies {
    constructor(symbol, id, quantity) {
        this.symbol = symbol;
        this.id = id;
        this.quantity = quantity;
    }
    strategyOne() {
        strategy.oneStream(this.symbol, this.id, this.quantity)
    }
    strategyTwo() {
        strategy.twoStream(this.symbol, this.id, this.quantity)
    }
}
/*
    var init = new strategies('BNBUSDT', 'd44r874', '0.05');
    init.strategyTwo();
*/
const Bot = {
    start : async (auth,symbol,id,quantity,strategy) => {
        var authClient = Binance(auth);
        console.log(strategy,' | ',symbol,' | ',id,' | ',auth,' | ',quantity);
        return true;
    }
}

exports.Bot = Bot;



