
const express = require("express");
const {RouteControl} = require("./controllers/RouteControl");
const app = express();


app.get("/",RouteControl.start);
app.get("/testBot",RouteControl.testBot);
app.get("/status",RouteControl.status);
app.get("/login", RouteControl.page.login);
app.get("/order/:orderId", RouteControl.getOrder);


app.post("/login", RouteControl.login);
app.post("/cancelOrder/:orderId", RouteControl.cancelOrder);
app.post("/botOrder/:symbol/:quantity/:price");



app.listen(3030,async () => {
    console.log("Great-Light Bot Running")
})