

const BotMonitor = {
    log : (from,msg,id) => {
        console.log(`[${id}][${from}](@${new Date().toISOString()}):: `,msg);
    },
    error : () => {

    }
}

exports.BotMonitor = BotMonitor;