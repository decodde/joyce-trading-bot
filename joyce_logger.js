const api = require('@marcius-capital/binance-api');
const Binance = require("binance-api-node").default;

const ema = require('trading-indicator').ema
const alerts = require('trading-indicator').alerts;

const { testConsole: test } = require("./testConsole");
const client = Binance();
const { config } = require("./config");


const _bConfig = {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    httpFutures: true,

}
const authClient = Binance(_bConfig);

const { Misc } = require("./Misc");

const { Brain } = require("./controllers/Brain");
const fetch = require('node-fetch');
const crypto = require('crypto');

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
const EMA = require('technicalindicators').EMA;
const _EMA = require("@aduryagin/technical-indicators").EMA;

const strategy = {
    twoStream: async (symbol, id, quantity) => {
        authClient.ws.futuresUser(async (x) => {
            var { symbol, eventType, orderStatus, clientOrderId, orderType, executionType, realizedProfit,priceLastTrade, positionSide } = x;
            if (eventType == 'ORDER_TRADE_UPDATE') {
                var isStrategyTwo = clientOrderId.includes('rxTwo');
                if (orderStatus == 'FILLED' && orderType == 'MARKET' && executionType == 'TRADE' && realizedProfit == '0' && isStrategyTwo) {
                    test.log("================================================================");
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
                        callbackRate: '0.1',
                        newClientOrderId: customId + 'ts'
                    });
                    test.log(tsOrder);
                }
            }
        })
        return new Promise(async (resolve, reject) => {
            var _firstCandles = await getCandles(symbol);
            var prices = _firstCandles.all.map(o => { return { close: Number(o['close']), time: o['closeTime'] } });

            var _prices = await  _firstCandles.all.map(o => { return Number(o['close'])});
            var candles = prices;
            var period = 10;
            var _ema10 = _EMA({candles, period });
            period = 50;
            var _ema50 = _EMA({candles, period });
            
            //var _ema50 = _EMA({candles, period50});
            let signalFound = false;
            var sp = symbol.split('USDT');

            var _symbol = `${sp[0]}/USDT`;
            var lastCandles = _firstCandles.last3Candle;
            api.stream.kline({ symbol: symbol, interval: config.botTimeFrame }, async (data) => {
                /*
                test.log(`final? : ${data.kline.final}`);    
                */

                //console.log(_ema10.result().slice(-1));
               // var _up10 = ema10.nextValue(data.kline['close']);
               // console.log(_up10);
               var _10 = _ema10.update({close : data.kline['close'] , time : data.kline['closeTime']}).value ;
               var _50 = _ema50.update({close : data.kline['close'], time : data.kline['closeTime']}).value ;

               console.log("10:: ",_10);
               console.log("50:: ",_50);
                
                var _upSignal, _downSignal;
                /*
                if (_10 == _50) {
                    console.log('equal');
                }
                console.log(_10);
                console.log(_50);
                _upSignal = (_10 > _50) ? true : false;
                _downSignal = (_10 < _50) ? true : false;

                if (_upSignal) {
                    console.log("greater");
                }
                if (_downSignal) {
                    console.log('lesser');
                }
                */
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
                    signalFound = false;
                }
                //*
                //var _upSignal = await alerts.goldenCross(10, 50, 'binance', _symbol, '1m', true)
                console.log('a> ', _upSignal);
                //var _downSignal = await alerts.deathCross(10, 50, 'binance', _symbol, '1m', true)
                console.log('b', _downSignal)
                /*/
                
                /*

                var _upSignal = await alerts.emaCrossUp(10, 50, 'binance', _symbol, '1m', true) 
                console.log('a> ',_upSignal);
                var _downSignal = await alerts.emaCrossDown(10, 50, 'binance', _symbol, '1m', true) 
                console.log('b', _downSignal)
                */

                /*
                

                let last_two = lastCandles.slice(-2,);
                //get support levels from candle data
                var supports = await getSupports(_firstCandles.all);
                //get resistance levels from candlesticks
                var resistance = await getResistance(_firstCandles.all);
                var isBullE = await _candlestick.isBullishEngulfing(last_two);
                var isBearE = await _candlestick.isBearishEngulfing(last_two);
                var _currentClosePrice = Number(last_two[1]['close']).toFixed(3);
                test.log(isBullE, " : ", isBearE);
                //console.log(resistance)
                var two_r_away = resistance.two_resistance_away ? resistance.two_resistance_away.p : supports.two_support_away.p;


                if (isBullE && _upSignal) {
                    //BUY POSITION
                    var _side = 'BUY';
                    var _positionSide = 'LONG';
                    if (signalFound == false) {

                        console.log(`Bullish Engulfing & GCross found `)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        test.log(supports.last_two);

                        var c = await calculateTpSl(_side, supports, resistance, _currentClosePrice);
                        var { tp, sl } = c;
                        var takeProfit = tp;
                        var stopLoss = sl;

                        console.log(`test stop_loss: ${_currentClosePrice}|${stopLoss} > `, _currentClosePrice >= stopLoss);
                        console.log(`test take_profit:  ${_currentClosePrice}|${takeProfit} > `, _currentClosePrice <= takeProfit);
                        //check if takeProfit and stopLoss situable ; if not get another
                        //(_currentClosePrice >= stopLoss) ? "" : stopLoss = await getStopLoss(supports.supports,_currentClosePrice,stopLoss);

                        //console.log(`Two support points away:: ${supports.two_support_away.p}`);
                        //console.log(`Two resistance points away:: ${resistance}`);

                        var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

                        console.log(_customId);
                        //var newOrder = await testOrder('BUY',symbol,_customId,_currentClosePrice,takeProfit,stopLoss);
                        ////*
                        signalFound = true;
                        var _order = {
                            symbol: symbol,
                            side: _side,
                            quantity: quantity,
                            customId: _customId,
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
                        //console.log(newOrder);
                    }
                }
                else if (isBearE && _downSignal) {
                    if (signalFound == false) {
                        var _side = 'SELL';
                        var _positionSide = 'SHORT';
                        console.log(`Bearish Engulfing found`)
                        console.log(`   => Signal @ price : ${last_two[1]['close']} time:${last_two[1]['closeTime']}`)
                        console.log(supports.last_two);
                        console.log(`Two resistance points away::`, resistance.two_resistance_away);
                        var _customId = await Misc.generateOrderId(id, symbol, last_two[1]['closeTime'], 2);

                        var c = await calculateTpSl(_side, supports, resistance, _currentClosePrice);
                        var { tp, sl } = c;
                        var takeProfit = tp;
                        var stopLoss = sl;


                        console.log(_customId)
                        console.log(`sell_test stop_loss: ${_currentClosePrice}|${stopLoss} >> `, _currentClosePrice <= stopLoss);
                        console.log(`sell_test take_profit:  ${_currentClosePrice}|${takeProfit} >> `, _currentClosePrice >= takeProfit);
                        // var newOrder = await testOrder('SELL',symbol,_customId,_currentClosePrice,takeProfit,stopLoss);
                        signalFound = true;
                        var _order = {
                            symbol: symbol,
                            side: _side,
                            quantity: quantity,
                            customId: _customId,
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
                */
            })
        })
    }
}

//STRATEGY ONE
//When there is a bullish engulfing
//  Position : BUY
//  STOP_LOSS : 2 SUPPORTS AWAY FROM ENTRY POINT
//
//
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

var init = new strategies('ETHUSDT', 'd44r874', '0.01');
init.strategyTwo();


