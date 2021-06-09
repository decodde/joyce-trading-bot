require("dotenv").config();

const test = {
    warn : (x) => {
        if (process.env.TEST_CONSOLE_MODE == 'ON'){
            console.log(x);
        }
    },
    log : (x) => {
        if (process.env.TEST_CONSOLE_MODE == 'ON'){
            console.log(x);
        }
    }
}

exports.testConsole = test;