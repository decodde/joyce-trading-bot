const Binance = require("binance-api-node");
const client = Binance();
const {config} = require("./config");
const authClient = Binance(config);

const _exchangeInfo = async () => {
    return await authClient.futuresExchangeInfo();
}

_exchangeInfo();