'use strict'

var auth = require("../helpers/auth");
var fs = require('fs');

const { execSync } = require('child_process');

var mongoose = require('mongoose');

/**
 * 0 = waiting
 * 1 = testing
 * 2 = failed
 * 3 = completed
 */
var status = 0;

exports.sendDetailsPost = function (args, res, next) {
    var jwttoken = args.body.jwttoken;
    var wifissid = args.body.wifissid;
    var wifipassword = args.body.wifipassword;

    if(jwttoken && wifissid && wifipassword) {

        execSync('cp /etc/wpa_supplicant/wpa_supplicant.conf.orig /etc/wpa_supplicant/wpa_supplicant.conf');

        fs.appendFileSync('/etc/wpa_supplicant/wpa_supplicant.conf',
            'network={\n' +
            '       ssid=\"' + wifissid + '\"\n' +
            '       psk=\"' + wifipassword + '\"\n' +
            '}'
        );

        execSync('wpa_cli -i wlan0 reconfigure');

        var response = {error: "Completed"};
        res.writeHead(200, {"Content-Type": "application/json"});
        return res.end(JSON.stringify(response));
    } else {
        var response = {error: "Error: Bad Request"};
        res.writeHead(400, {"Content-Type": "application/json"});
        return res.end(JSON.stringify(response));
    }
};

exports.getStatusGet = function (args, res, next) {
    var response = {
        status: "waiting",
        details: "Waiting for setup details to be sent."
    };
    res.writeHead(200, {"Content-Type": "application/json"});
    return res.end(JSON.stringify(response));
};