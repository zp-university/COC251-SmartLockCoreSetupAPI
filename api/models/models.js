/*jslint node:true, es5:true, nomen: true, plusplus: true */
/*globals module */
/*globals require */


//limit the scope
(function(){
    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    var settings = new Schema({
        jwttoken        : {type : String},
        wifissid        : {type : String},
        wifipassword    : {type : String}
    });

    module.exports.Settings = mongoose.model('Settings', settings);

    module.exports.getId = function (id) {
        "use strict";
        try {
            return mongoose.Types.ObjectId(id);
        } catch (ex) {
            console.log(ex);
            return null;
        }
    };
}());