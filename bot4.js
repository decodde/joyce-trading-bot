const ws = require('ws');
let _ws = new ws(config.wsUrl)

        console.log('\n-->> New Account Websocket')
        
        _ws.on('open', (a) => {
            console.log('\n-->> Websocket Account open...')
            resolve(_ws)
        }, err => { 
            console.log('fetchAccountWebsocketData error:', err)
            reject(err) 
    })

const LISTEN_KEY_ENDPOINT = `${config.url}/listenKey`;

const fetchAccountWebsocketData = async() => { 
  const listenKey = await fetchListenKey()

  console.log('-> ', listenKey) // valid key is returned

  try {
    __ws = await openWebSocket(`${config.wsUrl}/${listenKey}`)
  } catch (err) {
    throw(`ERROR - fetchAccountWebsocketData: ${err}`)
  }

  // Nothing returns from either
  __ws.on('message', data => console.log(data))
  __ws.on('outboundAccountInfo', accountData => console.log(accountData))
}

const openWebSocket = async () => {
    let p = new Promise((resolve, reject) => {
        
  })

  p.catch(err => console.log(`ERROR - fetchAccountWebsocketData: ${err}`))
  return p
}

const fetchListenKey = async () => {
    var _listenKey = ""
    try{
    
        var a = await fetch(LISTEN_KEY_ENDPOINT,{
            method:"POST",
            headers : {
                'X-MBX-APIKEY': config.apiKey
            }
        })
        var _a = await a.json();
        console.log("key: ",_a);
        return _a.listenKey;
    }
    catch(e){
        console.log(e)
    }

}