

const BotMonitor = {
    log : (from,msg,id) => {
        console.log(`[${id}][${from}]:: `,msg);
    },
    error : () => {

    }
}

exports.BotMonitor = BotMonitor;