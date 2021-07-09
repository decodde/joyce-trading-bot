let switchTo = async (x) => {
    //console.log(x)
    var views = document.getElementsByClassName('view');
    //console.log(views)
    for (var i = 0; i < views.length; i++) {
        views[i].classList.replace('h-show', 'h-hide');
    }
    if (x == '1') {
        //console.log('1)')
        document.getElementById('binanceKeys').classList.replace('h-hide', 'h-show');
    }
    else if (x == '2') {
        //console.log('2)')
        document.getElementById('startBot').classList.replace('h-hide', 'h-show');
    }
    else if (x == '3') {
        //console.log('3)')
        document.getElementById('stopBot').classList.replace('h-hide', 'h-show');
    }
}

let edit = async () => {
    document.getElementById("apiKey").removeAttribute('disabled');
    document.getElementById("apiSecret").removeAttribute('disabled');
}

document.getElementById('binanceKeys').onsubmit = (async (e) => {
    e.preventDefault();
    //console.log('binanceK')
    var apiKey = document.getElementById('apiKey').value;
    var apiSecret = document.getElementById('apiSecret').value;

    var opt = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            apiKey: apiKey,
            apiSecret: apiSecret
        })
    }
    try {
        var _req = await fetch('/submitKeys', opt);
        _req = await _req.json();
        if (_req.type == "success") {
            //notify success
            document.getElementById('apiSecret').setAttribute('disabled', '');
            document.getElementById('apiKey').setAttribute('disabled', '');
            console.log(_req)
            notify('s',_req.msg);
        }
        else if (_req.type == "error") {
            notify('e',_req.msg);
        }
        else {
            console.log(_req);
            notify('e','Could not connect to rocket125x server. Connection issues?')
        }
    }
    catch (e) {
        console.log(e);
        notify('e','Could not connect to rocket125x server. Connection issues?')
    }
})

var logout = async () => {
    var opt = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
        })
    }
    try {
        var _req = await fetch('/logout', opt);
        _req = await _req.json();
        if (_req.type == "success") {
            console.log(_req)
            window.location.href = "/";
            notify('s','Logged out');
        }
        else {
            console.log()
            notify('e',`Error logging out, ${_req.msg}`);
            notify('e',`Redirecting to login`);
            window.location.href = "/";
        }
    }
    catch (e) {
        notify('e','Could not connect to rocket125x server. Connection issues?');
        window.location.reload()
        console.log(e);
    }
}

var notify = (type, msg) => {
    var not = document.createElement('not');
    if (type == "e") {
        not.innerHTML = `<div class="h-anim-rollin notify notify-error">
                            <p class="h-text">
                                ${msg}
                            </p>
                        </div>`
    }
    else {
        not.innerHTML = `<div class="notify notify-success">
                            <p class="h-text">
                                ${msg}
                            </p>
                        </div>`
    }
    document.body.append(not);
    setTimeout(() => {
        not.remove()
    }, 3000);
}
document.getElementById('startBot').onsubmit = (async (e) => {
    e.preventDefault();
    console.log('=======startBot========');
    var strategy = document.getElementById('strategy').value;
    var symbol = document.getElementById('symbol').value;
    var leverage = document.getElementById('leverage').value;
    var minNotional = document.getElementById('minNotional').value;
    var quantityPrecision = document.getElementById('quantityPrecision').value;
    var opt = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            strategy: strategy,
            symbol: symbol,
            leverage: leverage,
            minNotional : minNotional,
            quantityPrecision : quantityPrecision
        })
    }
    try {
        var _req = await fetch('/botOrder', opt);
        _req = await _req.json();
        if (_req.type == "success") {
            console.log(_req)
            window.location.reload();
            notify('s','Bot started');
        }
        else {
            console.log()
            notify('e',_req.msg);
        }
    }
    catch (e) {
        notify('e','Could not connect to rocket125x server. Connection issues?');
        console.log(e);
    }
});

let leverageCheck = async () => {
    var _lev = document.getElementById('leverage');
    var lev = document.getElementById('leverage').value;
    lev = Number(lev);
    if(lev >= 1 && lev <= _lev.max){
        console.log("Good Good")
    }
    else {
        notify('e','Leverage is invalid');
        document.getElementById('leverage').value = 20;
    }
}
let symbolInfo = async () => {
    var symbol = document.getElementById('symbol').value;
    
    try{
        var _req = await fetch("/getSymbolInfo");
        _req = await _req.json();
        
        if(_req.type == "success"){
            var _sym = _req.data;
            _sym = _sym.filter(o => {
                if(o.pair == symbol){
                    return o;
                }
            })
            var __sym = _sym[0];
            console.log(__sym)
            var quantityPrecision = __sym.quantityPrecision;
            console.log('quant:>:  ',quantityPrecision);
            document.getElementById('quantityPrecision').value = quantityPrecision;
            var minNotional = __sym.filters.find(o=>o.filterType == 'MIN_NOTIONAL');
            document.getElementById('minNotional').value = minNotional.notional;
            
            try{
                console.log("here")
                var _opt = {
                    method : 'POST',
                    headers : {
                        "Content-type" : "application/json"
                    },
                    body : JSON.stringify({
                        symbol : symbol
                    })
                }
                var __req = await fetch("/getLeverage",_opt);
                __req = await __req.json();
                console.log(__req)
                var _lev = document.getElementById('leverage');
                _lev.max = __req.data[0].brackets[0]['initialLeverage'];
                console.log(_lev);
            }
            catch(e){

            }
        }
        else{
            console.log(_req)
            notify('e',`Could not get ${symbol} info`);
        }
    }
    catch(e){
        console.log(e);
        notify('e', 'Error getting symbol info; Probably network issues?');
    }
}

let stopBot = async () => {
    var opt = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        }
    }
    try {
        var _req = await fetch('/stopBot', opt);
        _req = await _req.json();
        if (_req.type == "success") {
            notify('s', 'Successfully stopped bot');
            window.location.reload();
        }
        else {
            notify('e', 'Error stopping bot');
            console.log(_req);
        }
    }
    catch (e) {
        console.log(e);
        notify('e', 'Error stopping bot; Probably network issues?');
    }
}