const Misc = {
    generateOrderId : async (id,symbol,t,num) => {
        t ? t = t : t = new Date().getUTCMilliseconds();
        var strat = "strat";
        if (num) {
            strat = `${strat}One`;
        }
        else if (num) {
            strat = `${strat}Two`;
        }
        else {
            strat = `${strat}Three`
        }
        return `rocket125x_${id}_${symbol}_${strat}_${t}`;
    }
}

exports.Misc = Misc;