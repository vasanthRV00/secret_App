
require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());






mongoose.set('strictQuery', true); mongoose.connect('mongodb+srv://mongodb.net/userDB');


const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

//access to passport-google-Oauth

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secret-app-a6mx.onrender.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);


//Oauth callbacks to the secret page 

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });



app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

// use the 'field not null'   function by using this function, declare a value "userWithSecrets" which run a forEach function
// array in secrets.ejs file which makes a user to submit a secret that will float in secret page

app.get("/secrets", function(req, res){
    
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {userWithSecrets: foundUsers})
            }

        }
    });
    
});

app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }

});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;

console.log(req.user.id);

User.findById(req.user.id, function(err, foundUser){
    if (err) {
        console.log(err);
    } else {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            foundUser.save(function(){
                res.redirect("/secrets");
            });
        }
    }
});
});


// callback function is must required for logout

app.get('/logout', function(req, res) {
    req.logout(function(err) {
      if (err) { 
        console.log(err); 
    } else {
        res.redirect('/');
    }
      
    });
  });

//User Authenticate via register their account

app.post("/register", function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local") (req, res, function(){
                res.redirect("/secrets");
            });
        
        }

    })

   
    
});

app.post("/login", function(req, res){

    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local") (req, res, function(){
                res.redirect("/secrets");
            });
        
        }
    });

 

});






let port = process.env.PORT;
if (port == null || port == ""){
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has been started sucessfully");
});
