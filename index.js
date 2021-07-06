
const express = require("express");
const {RouteControl} = require("./controllers/RouteControl");
const app = express();
var session = require('express-session');
app.use(require('body-parser')());
app.use(express.static(__dirname+"/public"));
app.set('views',__dirname+"/views");
app.set('view engine', 'pug');
app.use(session({
    maxAge: 600000,
    secret: 'great_light',
    resave: true,
    saveUninitialized: false
  }));
/*
app.use(session({
  maxAge:600000,
  secret: 'ninchat',
  resave: true,
  saveUninitialized: false
}));
*/

app.use((req, res, next)=> {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,ninchat,apiKey");
  res.header("Access-Control-Allow-Methods","PUT,DELETE,POST,GET")
  next();
});

app.get("/",RouteControl.start);
//app.get("/testBot",RouteControl.testBot);
app.get("/status",RouteControl.status);
app.get("/login", RouteControl.page.login);
app.get("/onboard", RouteControl.page.onboard)
app.get("/order/:orderId", RouteControl.auth ,RouteControl.getOrder);
app.get("/dashboard", RouteControl.auth, RouteControl.page.dashboard);
app.get("/mini", RouteControl.auth, RouteControl.miniDash)

app.post("/getLeverage", RouteControl.auth, RouteControl.getLeverage);
app.post("/submitKeys", RouteControl.auth, RouteControl.submitKeys);
app.post("/login", RouteControl.login);
app.post("/onboard", RouteControl.onboard);
app.get("/getSymbolInfo", RouteControl.getSymbolInfo);
app.post("/botOrder", RouteControl.auth, RouteControl.botOrder);
app.post("/stopBot", RouteControl.auth, RouteControl.stopBot)



app.listen(3030,async () => {
    console.log("Great-Light Bot Running")
})