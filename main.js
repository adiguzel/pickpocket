var zalandoConfiguration = require("./zalando-configuration.json");
var mongoose = require('mongoose');
mongoose.connect(zalandoConfiguration.db.address + zalandoConfiguration.db.name);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback () {
    var Crawler = require("crawler").Crawler;
    var Item = require("./models/item.js").Item(mongoose);
    
    var zalandoCrawler = require("./controllers/zalandoCrawler.js")
  					     .ZalandoCrawler(zalandoConfiguration, Crawler, Item)
  					     .start();
});
