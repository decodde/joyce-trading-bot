
const express = require("express");
const {RouteControl} = require("./controllers/RouteControl");
const app = express();


app.get("/",RouteControl.start);
app.get("/testBot",RouteControl.testBot);
app.get("/status",RouteControl.status);



app.listen(3030,async () => {
    console.log("Great-Light Bot Running")
})