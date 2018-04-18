"use strict";

var app = require("express")();
var swaggerTools = require("swagger-tools");
var YAML = require("yamljs");

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var dbHost = "127.0.0.1";
var dbPort = "27017";
var dbName = "smartlockcore";

//mongoose.connect('mongodb://' + dbHost + ':' + dbPort + '/' + dbName);
//var model = require('./api/models/models');

var auth = require("./api/helpers/auth");
var swaggerConfig = YAML.load("./api/swagger/swagger.yaml");

swaggerTools.initializeMiddleware(swaggerConfig, function (middleware) {
    //Serves the Swagger UI on /docs
    app.use(middleware.swaggerMetadata()); // needs to go BEFORE swaggerSecurity

    app.use(
        middleware.swaggerSecurity({
            //manage token function in the 'auth' module
            Bearer: auth.verifyToken
        })
    );

    var routerConfig = {
        controllers: "./api/controllers",
        useStubs: false
    };

    app.use(middleware.swaggerRouter(routerConfig));

    app.use(middleware.swaggerUi());

    app.listen(3000, '192.168.4.1', function () {
        console.log("Started server on port 3000");
    });
});
