//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

// GET API KEY FROM EXTERNAL FILE specifically the .env file
// console.log(process.env.API_KEY);




app.use(express.static("public"));
// Sets view engine for ejs 
app.set("view engine", "ejs");
// accepts any Unicode encoding of the body and supports automatic inflation of gzip and deflate encodings (REQUIRED CODE FOR BODYPARSER)
app.use(bodyParser.urlencoded({
    extended:true
}));



app.use(session({
    secret : "Andrew Einarsen",
    resave : false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());






// makes use of npm module mongoose to start server on mongodb
mongoose.connect("mongodb://localhost:27017/userDB", {useNewURlParser:true});
// mongoose.set("useCreateIndex", true);



const userSchema = new mongoose.Schema ({
    email : String,
    password : String,
    googleId: String,
    secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);





// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());


passport.serializeUser(function(user, done){

    done(null, user.id);
  
  });

  passport.deserializeUser(function(id, done){
  
    User.findById(id, function(err, user){
  
      done(err, user);
  
    });
  
  });



// Google login authorisation using passport module
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));






// makes a get request to home route and uses home.ejs
app.get("/",function(req, res){
    res.render("home");
});
// makes a get request for the google authorisation then send the user to the google authentication
app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] } )
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });







// makes a get request to /login route and uses login.ejs when login href triggered from home route
app.get("/login",function(req, res){
    res.render("login");
});
// makes a get request to /register route and uses register.ejs when register href triggered from home route
app.get("/register",function(req, res){
    res.render("register");
});


app.get("/secrets", function(req, res){
// looks thru the database collection for the secret field that has data 
    User.find({"secret": {$ne: null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render("secrets", {usersWithSecrets: foundUser});
            }
        }
    });
    // checking if the user is Authenticated
    // if (req.isAuthenticated()){
    //     res.render("secrets");
    // } else{
    //     res.redirect("/login")
    // }
});


app.get("/submit",function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else{
        res.redirect("/login")
    }
});

app.post("/submit",function(req, res){
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if (err){
            console.log(err);
        } else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/logout", function(req, res){
    req.logout(function(err) {
        if (err) { return next(err); }
    res.redirect("/");
    });
});




// catches when submit button is triggered and posts the data to the database
app.post("/register", function(req, res){
    // creates a user for the database using passport local mongoose module
    User.register({username : req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});



app.post("/login", function(req, res){

    const user = new User({
        username : req.body.username,
        password : req.body.password
    });

    req.logIn(user, function(err){
        if (err){
            console.log(err)
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }

    });

});


















app.listen(3000, function(){
    console.log("Server running on port 3000.")
});