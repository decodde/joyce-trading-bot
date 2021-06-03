const api = require('@marcius-capital/binance-api');

const klineStream = async (d) => {
    console.log(d)
}
const kline = {
    stream : async (symbol) =>{
        return new Promise((resolve,reject) => {
            api.stream.trade(symbol,(data) => {
                console.log(data);
                resolve(data);
            });
        });
    },
    rest : async (symbol,interval) => {
        var _k = await api.rest.trades({ symbol: symbol, interval: '1m', limit: 500 });
        console.log(_k);
        return _k;
    }
}
kline.rest("btcusdt")