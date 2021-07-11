const {Brain} = require('./Brain');
const {Response} = require("./misc/Response")
const RouteControl = {
    auth: (req, res, next) => {
        if (req.session.user) {
            next();
        }
        else {
           //var err = new Error("User not logged in");
            res.render("403");
        }
    },
    start : async (req,res) => {
        res.render('start');
    },
    page : {
        login : async (req,res) => {
            var user = req.session.user;
            if(user){
                res.status = 302;
                res.redirect("/mini");
            }
            else{
                res.render('login');
            }
        },
        onboard : async (req,res) => {
            var user = req.session.user;
            if(user){
                res.status = 302;
                res.redirect("/mini");
            }
            else{
                res.render('signup');
            }
        },
        dashboard : async (req,res) => {
            //console.log(req.session.user);
            var orders =  await Brain.user.myOrders(req.session.user);
            res.render('dashboard',{user : req.session.user,orders : orders});
        },
        subscribe : async (req,res) => {
            var user = req.session.user;
        //console.log(symbol);
            var _data = await Brain.user.getById(user._uid);
            res.render("subscribe", {data : _data.data});
        },
        referandearn : async (req,res) => {
            var user = req.session.user;
            var _data = await Brain.user.getById(user._uid);
            res.render("refer", {data : _data.data});
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
                if(user.subscribed == true){
                    res.redirect("/mini");
                }
                else {
                    res.redirect("/subscribe")
                }
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
    withdrawRefer : async (req,res) => {
        var user = req.session.user;
        var _data = await Brain.user.getById(user._uid);
        var withd = await Brain.user.withdrawRefer(_data.data);
        res.json(withd);
    },
    miniDash : async (req,res) => {
        var user = req.session.user;
        var _sym = await Brain.getSymbolInfo();
        var _data = await Brain.user.getById(user._uid);
        console.log(_data);
        if(_data.data.subscribed == true){
            res.render("minidash",{data : _data.data, symbols : _sym});
        }
        else{
            res.status = 302;
            res.redirect("/subscribe")
        }
        console.log(_data.data)
    },
    logout : async (req,res) => {
        var user = req.session.user;
        if (user._uid){
            req.session.destroy();
            res.json(Response.success());
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
        var _data = await Brain.user.getById(user._uid);
        var gt = await Brain.getLeverage(_data.data,symbol);
        res.json(gt);
    },
    stopBot : async (req,res) => {
        let user = req.session.user;
        let _stop = await Brain.user.stopBot(user);
        res.json(_stop)
    },
    botOrder : async (req,res) => {
        let user = req.session.user;
        var _data = await Brain.user.getById(user._uid);
        var a = await Brain.user.botOrder(_data.data,req.body);
        res.json(a);
    },
    pay : async (req,res) => {
        let user = req.session.user;
        var _data = await Brain.user.getById(user._uid);
        var a = await Brain.user.pay(_data.data,req.body);
        res.json(a);
    },
    getDepositAddress :  async (req,res) => {
        var dp =  await Brain.user.getDepositAddress();
        res.json(dp);
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