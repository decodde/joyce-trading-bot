let switchTo = async (x) => {
    //console.log(x)
    var views = document.getElementsByClassName('view');
    //console.log(views)
    for (var i = 0; i < views.length; i++) {
        views[i].classList.replace('h-show', 'h-hide');
    }
    if (x == '2') {
        //console.log('1)')
        document.getElementById('subscribe').classList.replace('h-hide', 'h-show');
    }
    else if (x == '1') {
        //console.log('2)')
        document.getElementById('active').classList.replace('h-hide', 'h-show');
    }
    else if( x == '3'){
            //console.log('1)')
            document.getElementById('binanceKeys').classList.replace('h-hide', 'h-show');
    }
}

let closePop = async () => {
    document.getElementById('confirm').classList.replace('h-show','h-hide');
}

let payPop = async (x) => {
    var addressUrl = document.getElementById('addressUrl');
    var _address = document.getElementById('address');
    var subType = document.getElementById('subType');
    var plan = document.getElementById('plan');
    var cpBtn = document.getElementById('confirmPay');
    cpBtn.setAttribute('disabled','');
    if (x == 1){
        plan.innerHTML = "Emerald Plan";
    }
    else if (x==2){
        plan.innerHTML = "Onyx Plan"
    }
    try{
        var _add = await fetch("/depositAddress");
        _add = await _add.json();
        console.log("here");
        if(_add.type == "success"){
            var {url, address, coin} = _add.data;
            cpBtn.removeAttribute('disabled');
            addressUrl.href = url;
            addressUrl.text = url;
            console.log(address)
            _address.innerText = address;
            subType.value = x;
            console.log(_add);
        }
        else if( _add.type == "error") {
            cpBtn.setAttribute('disabled','');
            notify('e',_add.msg);
            console.log(_add);
        }
        else {
            cpBtn.setAttribute('disabled','');
            notify('e','Error connecting to rocket125x server. Probably connection issues?');
        }
    }
    catch(e){
        console.log("ere")
        console.log(e);
        notify('e','Error connecting to rocket125x server. Probably connection issues?')
    }
    
    document.getElementById('confirm').classList.replace('h-hide','h-show');
}
let payConfirm = async () => {

}

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
        console.log(_req.status)
        _req = await _req.json();
        if (_req.type == "success") {
            console.log(_req)
            window.location.href = "/";
            notify('s','Logged out');
        }
        else if (_req.type == "error") {
            console.log()
            notify('e',`Error logging out, ${_req.msg}`);
            notify('e',`Redirecting to login`);
            window.location.href = "/";
        }
        else{
            notify('e',`Error logging out, `);
        }
    }
    catch (e) {
        window.location.href = "/";
        
        console.log(e);
    }
}
let pay = async () => {
    var subType = document.getElementById('subType').value;
    var _address = document.getElementById('address').innerText;
    var opt = {
        method  : 'POST',
        headers : {
            'content-type' : 'application/json',
        },
        body : JSON.stringify({
            subType : subType,
            address : _address
        })
    }
    try{
        var _req = await fetch("/paySubscription",opt);
        _req = await _req.json();
        console.log(_req);
        if(_req.type == "success"){
            notify('s',_req.msg);
        }
        else if (_req.type == "error"){
            notify('e',_req.msg);
        }
        else {
            notify('e',"Error");
        }
    }
    catch(e){
        notify('e','Error connecting to rocket125x server. Probably connection issues?');
    }
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
    }, 4000);
}