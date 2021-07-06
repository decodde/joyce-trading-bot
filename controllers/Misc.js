const Misc = {
    generateOrderId : async (id,symbol,t,num) => {
        t ? t = t : t = new Date().getUTCMilliseconds();
        var strat = "rx";
        if (num == 1) {
            strat = `${strat}One`;
        }
        else if (num == 2) {
            strat = `${strat}Two`;
        }
        else {
            strat = `${strat}Three`
        }
        return `${strat}_${id}_${t}`;
    }
}

exports.Misc = Misc;