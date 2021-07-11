let switchTo = async (x) => {
    //console.log(x)
    var views = document.getElementsByClassName('view');
    //console.log(views)
    for (var i = 0; i < views.length; i++) {
        views[i].classList.replace('h-show', 'h-hide');
    }
    if (x == '1') {
        //console.log('1)')
        document.getElementById('referral').classList.replace('h-hide', 'h-show');
    }
}

var withdraw = async () => {
    var opt = {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        }
    }
    try {
        var _req = await fetch("/withdrawRefer", opt);
        _req = await _req.json();
        if (_req.type == "success") {
            document.getElementById('withdraw').setAttribute('disabled', '');
            notify('s', 'Referral earnings withdrawal is being processed');
        }
        else if (_req.type == "error") {
            notify('e', _req.msg);
            console.log(_req.msg)
        }
        else {
            notify('e','Error occured')
        }
    }
    catch (e) {
        notify('e', 'Problem connecting to rocket125x. Network error');
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
    }, 4000);
}