const {Brain} = require('./Brain');

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
            var orders =  await Brain.user.myOrders({email : req.session.user.email});
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
                res.redirect("/dashboard");
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
            res.redirect("/dashboard");
        }
        else {
            res.render("signup", { message: trySignup.msg });
        }
    },
    miniDash : async (req,res) => {
        var user = req.session.user;
        res.render("minidash",{data : user});
    },
    status : async (req,res) => {

    },
    getOrder : async (req,res) => {

    },
    myOrders : async (req,res) => {

    },
    cancelOrder : async (req,res) => {

    },
    botOrder : async (req,res) => {
        let user = req.session.user;
        var a = await Brain.user.botOrder(user,req.body);
        res.json(a);
    },
    submitKeys : async (req,res) => {
        var user = req.session.user;
        var {email} = user;
        var submit = await Brain.user.submitKeys(email,req.body);
        res.json(submit);
    }

}

exports.RouteControl = RouteControl