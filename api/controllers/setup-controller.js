'use strict'

var fs = require('fs');

const uuidv4 = require('uuid/v4');

var request = require('superagent');

const { exec } = require('child_process');
var mongoose = require('mongoose');

var Settings = mongoose.model('Settings');

/**
 * 0 = waiting
 * 1 = testing
 * 2 = failed
 * 3 = completed
 */
var status = 0;

var wifissid;
var wifipassword;

exports.sendDetailsPost = function (args, res, next) {
    wifissid = args.body.wifissid;
    wifipassword = args.body.wifipassword;

    if(wifissid && wifipassword) {

        status = 1;

        resetWpaSupplicantConfig(args, res, next);
    } else {
        var response = {error: "Error: Bad Request"};
        res.writeHead(400, {"Content-Type": "application/json"});
        return res.end(JSON.stringify(response));
    }
};

var resetWpaSupplicantConfig = function (args, res, next) {
    exec('cp /etc/wpa_supplicant/wpa_supplicant.conf.orig /etc/wpa_supplicant/wpa_supplicant.conf', function(err, stdout, stderr) {
        if(err) status = 2;
        else appendToWpaSupplicant(args, res, next);
    });
};

var appendToWpaSupplicant = function(args, res, next) {
    fs.appendFile('/etc/wpa_supplicant/wpa_supplicant.conf',
        'network={\n' +
        '       ssid=\"' + wifissid + '\"\n' +
        '       psk=\"' + wifipassword + '\"\n' +
        '}',
        function(err) {
            if (err) status = 2;
            else reconfigureWifi(args, res, next);
        }
    );
};

var reconfigureWifi = function(args, res, next) {
    exec('sudo wpa_cli -i wlan0 reconfigure', function(err, stdout, stderr) {
        if(err) status = 2;
        else checkWifiConnected(args, res, next, 0);
    });
};

var checkWifiConnected = function(args, res, next, count) {
    exec('sudo wpa_cli -i wlan0 status', function(err, stdout, stderr) {
        if(err) status = 2;
        else if(stdout.indexOf("ip_address") > -1) {
            Settings.findOneAndUpdate({}, {uuid: uuidv4()}, {
                new: true,
                upsert: true
            }, function(err, task) {
                if(err) {
                    status = 2;
                } else {
                    let uuid = task.uuid;
                    request
                        .post('https://smartlockapp.zackpollard.pro/api/v1/device/register')
                        .send({name: "SMARTLOCK-CORE-A7C9F1", uuid: uuid})
                        .set('Accept', 'application/json')
                        .end((err, response) => {
                            if(err || !response || response.status !== 200) {
                                status = 2;
                            } else {
                                Settings.findOneAndUpdate({}, {jwttoken: response.body.token}, {
                                    new: true,
                                    upsert: true
                                }, function(err, task) {
                                    if(err) {
                                        status = 2;
                                        console.log("Mongo err");
                                        console.log(err);
                                    } else {
                                        status = 3;
                                        let response = {uuid: uuid};
                                        res.writeHead(200, {"Content-Type": "application/json"});
                                        return res.end(JSON.stringify(response));
                                    }
                                });
                            }
                        });
                }
            })
        } else {
            if(count < 30) {
                setTimeout(checkWifiConnected, 1000, args, res, next, ++count);
            } else {
                status = 2;
            }
        }
    });
};


exports.getStatusGet = function (args, res, next) {
    var response = {error: "Error: Server status was unknown."};
    var statusCode = (status <= 3 && status >= 0) ? 200 : 500;
    switch(status) {
        case 0: {
            response = {
                status: "waiting",
                details: "Waiting for user to send credentials."
            };
            break;
        }
        case 1: {
            response = {
                status: "testing",
                details: "Testing the provided credentials to ensure validity."
            };
            break;
        }
        case 2: {
            response = {
                status: "failed",
                details: "Provided details were incorrect or the selected Wi-Fi was out of range."
            };
            break;
        }
        case 3: {
            response = {
                status: "completed",
                details: "The provided details were correct and the device is ready to complete setup."
            };
            break;
        }
    }
    res.writeHead(statusCode, {"Content-Type": "application/json"});
    res.end(JSON.stringify(response));

    if (status === 3) {
        setTimeout(new function() {
            exec('sudo systemctl stop dnsmasq', function (err, stdout, stderr) {
            });
            exec('sudo systemctl stop hostapd', function (err, stdout, stderr) {
            });
        }, 5000);
    }
};