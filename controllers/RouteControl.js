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
            res.render('dashboard')
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
    status : async (req,res) => {

    },
    getOrder : async (req,res) => {

    },
    cancelOrder : async (req,res) => {

    },
    botOrder : async (req,res) => {

    },

}

exports.RouteControl = RouteControl