const express = require("express");
const fs = require('fs');
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const session = require('express-session');
const {SHA3} = require('sha3');
const PORT = process.env.PORT || 1337;
const db_inf = {
    host:"ex4users.mysql.database.azure.com",
    user:"maximplnv",
    password:"2684max4862!", 
    database:"users",
    port:3306, 
    ssl:{
        ca: fs.readFileSync("DigiCertGlobalRootCA.crt.pem")
    }}
const app = express();
app.set("view engine", "hbs");
var connection = mysql.createConnection(db_inf);
const urlencodedParser = bodyParser.urlencoded({extended: false});

app.use(session({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000}
}))
app.use(urlencodedParser);
app.use(bodyParser.json());


app.get("/users", function(request, response){
    if (request.session.loggedin){
        connection.query(`SELECT status FROM users WHERE id="${request.session.userId}"`, function(error, results){
            if (error){console.log(error)}
            if (results.length < 1){
                request.session.loggedin = false
            } else if (results[0].status == 0){
                request.session.loggedin = false
            }
            if(request.session.loggedin){
                connection.query('SELECT id, name, email, DATE_FORMAT(reg, "%m-%d-%Y"), DATE_FORMAT(login, "%m-%d-%Y"), status FROM users', function(error, results){
                    if (error) return console.log(error);
                    response.render(__dirname + "/table.hbs", {users: results});
                });
            } else {
                response.redirect("/autorization");
            }
        });
    } else {
        response.redirect("/autorization");
    }
});

app.get("/autorization", function(request, response){
    response.render(__dirname + "/login.hbs", {error: false, error_entry: false});
});

app.post("/autorization", function(request, response){
    if (!request.body) return response.status(400);
    var email = request.body.email;
    const hash = new SHA3(256);
    var password = hash.update(request.body.password).digest('hex');
    if (email == "" || request.body.password == ""){
        response.render(__dirname + "/login.hbs", {error: false, error_entry: true});
    } else {
        connection.query(`SELECT id, status FROM users WHERE email="${email}" and password="${password}"`, function(error, results){
            if (error){console.log(error)}
            if (results.length > 0 && results[0].status == 1){
                request.session.loggedin = true;
                request.session.userId = results[0].id;
                connection.query("UPDATE users SET login=NOW() WHERE id=?", request.session.userId , function(error, results){
                    if (error){console.log(error)}
                    response.redirect('/users');
                });
            } else {
                response.render(__dirname + "/login.hbs", {error: true, error_entry: false});
            }
        });
    }
});

app.get("/registration", function(request, response){
    response.render(__dirname + "/registration.hbs", {error_email: false, error_password: false, error_entry: false});
});

app.post("/registration", urlencodedParser, function(request, response){
    if (!request.body) return response.status(400);
    var name = request.body.name;
    var email = request.body.email;
    var password = request.body.password;
    var repid_psswrd = request.body.r_password;
    if (name == "" || email == "" || password == "" || repid_psswrd == ""){
        response.render(__dirname + "/registration.hbs", {error_email: false, error_password: false, error_entry: true});
    } else {
        connection.query(`SELECT id FROM users WHERE email="${email}"`, function(error, results){
            if (error){console.log(error)}
            if (password == repid_psswrd && results.length < 1){    
                const hash = new SHA3(256);
                password = hash.update(request.body.password).digest('hex');
                connection.query(`INSERT INTO users (name, email, reg, status, password) VALUES ("${name}", "${email}", NOW(), 1, "${password}")`, function(error, results){
                    if (error){console.log(error)}
                    response.redirect(301, "/autorization");
                });
            } else {
                if (password != repid_psswrd && results.length > 0){
                    response.render(__dirname + "/registration.hbs", {error_email: true, error_password: true, error_entry: false});
                } else if(password != repid_psswrd){
                    response.render(__dirname + "/registration.hbs", {error_email: false, error_password: true, error_entry: false});
                } else {
                    response.render(__dirname + "/registration.hbs", {error_email: true, error_password: false, error_entry: false});
                }
            }
        });
    }
});

app.get("/delete/", function(request, response){
    if (request.session.loggedin){
        if (request.query.ids){
            var str_ids = request.query.ids.join(', ');
        } else {
            var str_ids = '';
        }
        connection.query(`DELETE FROM users WHERE id IN (${str_ids})`, function(err, data){
            response.redirect("/users");
        });
    }
});

app.get("/block/", function(request, response){
    if (request.session.loggedin){
        if (request.query.ids){
            var str_ids = request.query.ids.join(', ');
        } else {
            var str_ids = '';
        }
        connection.query(`UPDATE users SET status=0 WHERE id IN (${str_ids})`, function(err, data){
            response.redirect("/users");
        });
    }
});

app.get("/unblock/", function(request, response){
    if (request.session.loggedin){
        if (request.query.ids){
            var str_ids = request.query.ids.join(', ');
        } else {
            var str_ids = '';
        }
        connection.query(`UPDATE users SET status=1 WHERE id IN (${str_ids})`, function(err, data){
            response.redirect("/users");
        });
    }
});

app.get("/", function(request, response){
    response.redirect(301, "/autorization");
});
app.listen(PORT);