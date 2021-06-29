let switchTo = async (x) => {
    console.log(x)
    var views = document.getElementsByClassName('view');
    console.log(views)
    for(var i = 0; i < views.length; i++){
        views[i].classList.replace('h-show','h-hide');
    }
    if (x == '1'){
        console.log('1)')
        document.getElementById('binanceKeys').classList.replace('h-hide','h-show');
    }
    else if (x == '2'){
        console.log('2)')
        document.getElementById('startBot').classList.replace('h-hide','h-show');
    }
}
document.getElementById('binanceKeys').onsubmit = (async (e) => {
    e.preventDefault();
    console.log('binanceK')
    var apiKey = document.getElementById('apiKey').value;
    var apiSecret = document.getElementById('apiSecret').value;

    var opt = {
        method : 'POST',
        headers : {
            'content-type' : 'application/json'
        },
        body : JSON.stringify({
            apiKey : apiKey ,
            apiSecret : apiSecret
        })
    }
    try{
        var _req = await fetch('/submitKeys',opt);
        _req = _req.json();
        if (_req.type == "success") {
            //notify success
            document.getElementById('apiSecret').setAttribute('disabled','');
            document.getElementById('apiKey').setAttribute('disabled','');
            console.log(_req)
        }
        else {
            console.log(_req)
        }
    }
    catch(e){
        console.log(e);
    }
})
document.getElementById('startBot').onsubmit = (async (e) => {
    e.preventDefault();
    console.log('startBot');
    var strategy = document.getElementById('strategy').value;
    var symbol = document.getElementById('symbol').value;
    var quantity = document.getElementById('quantity').value;


    var opt = {
        method : 'POST',
        headers : {
            'content-type' : 'application/json'
        },
        body : JSON.stringify({
            strategy : strategy ,
            symbol : symbol,
            quantity : quantity
        })
    }
    try{
        var _req = await fetch('/botOrder',opt);
        _req = _req.json();
        if (_req.type == "success") {
            console.log(_req)
        }
        else {
            console.log
        }
    }
    catch(e){
        console.log(e);
    }
})

let stopBot = async () => {
    var opt = {
        method : 'POST',
        headers : {
            'content-type' : 'application/json'
        }
    }
    try{
        var _req = await fetch('/stopBot',opt);
        _req = _req.json();
        if (_req.type == "success") {

        }
        else {
            
        }
    }
    catch(e){
        console.log(e);
    }
}