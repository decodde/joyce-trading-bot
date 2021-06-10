var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var order = new Schema({
  id:{type: String},
  symbol:{type:String},
  done : {type : Boolean},
  by : {type: String},
  side : {type:String},
  time : {type:Date},
  type: {type : String},
  quantity : {type : String},
  takeProfitPrice : {type: String},
  stopLossPrice : {type : String},
  callbackRate : {type : String},
  price : {type: String}
});
module.exports=mongoose.model("Order",order)