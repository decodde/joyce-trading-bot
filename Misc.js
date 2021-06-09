const Misc = {
    generateOrderId : async (id,symbol,t) => {
        t ? t = t : t = new Date().getUTCMilliseconds();
        return `${id}_${symbol}_${t}`
    }
}

exports.Misc = Misc;