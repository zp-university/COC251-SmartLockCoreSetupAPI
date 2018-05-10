"use strict";

const app = require("express")();
const swaggerTools = require("swagger-tools");
const YAML = require("yamljs");
const request = require('superagent');
const fs = require('fs');

const rpio = require("rpio");
rpio.open(12, rpio.OUTPUT, rpio.LOW);
rpio.open(16, rpio.OUTPUT, rpio.LOW);

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const dbHost = "127.0.0.1";
const dbPort = "27017";
const dbName = "smartlockcore";

mongoose.connect('mongodb://' + dbHost + ':' + dbPort + '/' + dbName);
const models = require('./api/models/models');
const Settings = mongoose.model('Settings');

const pollServerForUpdates = function() {
    Settings.findOne({}, function(err, task) {
        if(err) {
            rpio.write(12, rpio.LOW);
            rpio.write(16, rpio.LOW);
            console.debug("MongoDB error");
            setTimeout(pollServerForUpdates, 0);
        } else {
            request
                .get('https://smartlockapp.zackpollard.pro/api/v1/device')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + task.jwttoken)
                .end((err, response) => {
                    if(err || !response || response.status !== 200) {
                        rpio.write(12, rpio.LOW);
                        rpio.write(16, rpio.LOW);
                        console.debug("Response error");
                    } else {
                        console.log(response.body);
                        if(response.body.locked) {
                            rpio.write(12, rpio.HIGH);
                            rpio.write(16, rpio.LOW);
                            console.debug("Response: Locked");
                        } else {
                            rpio.write(16, rpio.HIGH);
                            rpio.write(12, rpio.LOW);
                            console.debug("Response: Unlocked");
                        }
                    }
                    setTimeout(pollServerForUpdates, 0);
                });
        }
    });
};

pollServerForUpdates();

const swaggerConfig = YAML.load("./api/swagger/swagger.yaml");

swaggerTools.initializeMiddleware(swaggerConfig, function (middleware) {
    //Serves the Swagger UI on /docs
    app.use(middleware.swaggerMetadata());

    const routerConfig = {
        controllers: "./api/controllers",
        useStubs: false
    };

    app.use(middleware.swaggerRouter(routerConfig));

    app.use(middleware.swaggerUi());

    app.listen(3000, '127.0.0.1', function () {
        console.log("Started server on port 3000");
    });
});