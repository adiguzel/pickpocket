var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback () {
    var Crawler = require("crawler").Crawler;
    var Item = require("./models/item.js").Item(mongoose);
    var zalandoConfiguration = require("./zalando-test-configuration.json");
    var zalandoCrawler = require("./controllers/zalandoCrawler.js")
  					     .ZalandoCrawler(zalandoConfiguration, Crawler, Item)
  					     .start();
});
