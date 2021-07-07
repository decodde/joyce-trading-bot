const {Brain} = require('./Brain');
const {Response} = require("./misc/Response")
const RouteControl = {
    auth: (req, res, next) => {
        if (req.session.user) {
            next();
        }
        else {
            var err = new Error("User not logged in");
            res.render("403");
        }
    },
    start : async (req,res) => {
        res.render('start');
    },
    page : {
        login : async (req,res) => {
            res.render('login');
        },
        onboard : async (req,res) => {
            res.render('signup');
        },
        dashboard : async (req,res) => {
            //console.log(req.session.user);
            var orders =  await Brain.user.myOrders(req.session.user);
            res.render('dashboard',{user : req.session.user,orders : orders});
        }
    },
    login : async (req,res) => {
        let tryLogin = await Brain.login(req.body);
        //console.log(tryLogin);
        if (tryLogin.type == "success") {
            var user = tryLogin.data;
            req.session.user = user;
            //console.log(user)
            if (user.admin) {
                res.status = 302;
                res.redirect("/admindashboard");
            }
            else if(!user.admin){
                res.status = 302;
                res.redirect("/mini");
            } 
            else{
                res.redirect("start");
            }
        }
        else {
            res.render("login", { message: "Invalid Login" });
        }
    },
    onboard : async (req,res) => {
        let trySignup = await Brain.onboard(req.body);
        if (trySignup.type == "success") {
            var user = trySignup.data;
            req.session.user = user;
            res.status = 302;
            res.redirect("/mini");
        }
        else {
            res.render("signup", { message: trySignup.msg });
        }
    },
    miniDash : async (req,res) => {
        var user = req.session.user;
        var _sym = await Brain.getSymbolInfo();
        var _data = await Brain.user.getById(user._uid);
        console.log(_data.data)
        res.render("minidash",{data : _data.data, symbols : _sym});
    },
    logout : async (req,res) => {
        var user = req.session.user;
        if (user.__uid){
            req.session.destroy();
            res.redirect('/');
        }
        else{
            res.json(Response.error("You are not logged in"));
        }
    },
    status : async (req,res) => {

    },
    getOrder : async (req,res) => {

    },
    getLeverage : async (req,res) => {
        var user = req.session.user;
        var {symbol} = req.body;
        //console.log(symbol);
        var gt = await Brain.getLeverage(user,symbol);
        res.json(gt);
    },
    stopBot : async (req,res) => {
        let user = req.session.user;
        let _stop = await Brain.user.stopBot(user);
        res.json(_stop)
    },
    botOrder : async (req,res) => {
        let user = req.session.user;
        var a = await Brain.user.botOrder(user,req.body);
        res.json(a);
    },
    submitKeys : async (req,res) => {
        var user = req.session.user;
        console.log(user)
        var {_uid} = user;
        if(_uid){
            console.log(_uid);
            var submit = await Brain.user.submitKeys(_uid,req.body);
            res.json(submit);
        }
        else{
            res.status = 302;
            res.redirect('/403');
        }
    },
    getSymbolInfo : async (req,res) => {
        var {symbol} = req.body;
        var _symInfo = await Brain.getSymbolInfo(symbol);
        res.json(_symInfo);
    },
    error : async (req,res) => {
        res.render('403');
    }

}

exports.RouteControl = RouteControl