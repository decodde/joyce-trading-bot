  
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var setting = new Schema({
    start: { type: Boolean }
});
module.exports = mongoose.model("Setting", setting);