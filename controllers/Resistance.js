const Resistance = {
    getResistances (ticks, period) {
        if (ticks && ticks.length > 0) {
            let resistances = [];
            let highs = ticks.map(x => x.high).sort();
            for(let i = 0; i < ticks.length; i += period) {
                resistances.push(Math.max(...highs.slice(i, i + period)));
            }

            return resistances.filter(x => x > ticks[0].price);
        }

        return [];
    },

    getFilteredResistances (ticks, shortPeriod = 8, longPeriod = 21) {
        if (ticks && ticks.length > 0) {
            let shortResistances = this.getResistances(ticks, shortPeriod);
            let longResistances = this.getResistances(ticks, longPeriod);
            let resistances = [];
            let eliminateResistances = [];
            shortResistances.push(...longResistances);

            shortResistances.sort((a, b) => a-b);

            for (let i = 0; i < shortResistances.length - 1; i++) {
                for (let j = i + 1; j < shortResistances.length; j++) {
                    let diffPrices = ((shortResistances[j] - shortResistances[i]) * 100) / shortResistances[i];

                    //console.log(shortResistances.length + ' ' + diffPrices + " " + i + " " + shortResistances[i] + " " + j + " " + shortResistances[j]);

                    if (diffPrices < 1) {
                        eliminateResistances.push(shortResistances[j])
                    } else {
                        i = j - 1;
                        break;
                    }
                }
            }

            resistances = shortResistances.filter(x => eliminateResistances.indexOf(x) < 0);
            resistances = resistances.filter(x => ((x - ticks[0].price) * 100 / ticks[0].price) > 1);

            return resistances;
        }

        return [];
    }
}

module.exports = new Resistance()
