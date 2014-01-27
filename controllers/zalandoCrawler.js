function ZalandoCrawler(configuration, Crawler, Item) {
	var self = this;
	var util = require('util');

	this.configure = function(configuration) {
   	  this.config = configuration;
    };
	
	this.crawl = function() {
		var config = this.config;
		config.shops.map(function(shop){
			config.genders.map(function(gender){
				config.colors.map(function(color){
					var domain = config.domain;
					// Url structure for  shop ,gender clothing  and color filtering
					// http://www.zalando.de/genderClothingFilterString/shopFilterString_colorFilter/
					// Ex : http://www.zalando.de/herrenbekleidung/esprit.esprit-collection_braun/
					var url = util.format(config.urlPatterns.genderShopColor.text, domain, gender.clothingFilter, shop.filter, color.filter) 
					console.log(url);
					function Configuration(shop, gender, color, domain){
						this.shop = shop;
						this.gender = gender;
						this.color = color;
						this.domain = domain;
					}
					var paginationExplorer = new ZalandoPaginationExplorer( new Configuration(shop, gender, color, domain), Crawler, Item).Crawler();
					paginationExplorer.queue(url);
				})
			})
		});
	};

	this.configure(configuration);
	return this;
}

module.exports.ZalandoCrawler = ZalandoCrawler

function ZalandoPaginationExplorer(configuration, Crawler, Item){
	var itemFinder = new ZalandoItemFinder(configuration, Crawler, Item).Crawler();

	this.Crawler = function() {
		return new Crawler({
		    "maxConnections":10,
		    "callback": queuePages
		});
	}

	var queuePages = function(error,result,$) { 
	  if(error == null) {
	    var firstPagination = $("div.pages").first();
	    var pages = firstPagination.find("ul li a");

	    pages.each(function(page) {
	      var uri = result.uri;
	      var paginationString = "?p="
	      console.log(page);
	      itemFinder.queue(uri + paginationString + page);
	    });
	  }
	};	
}

function ZalandoItemFinder(configuration, Crawler, Item) {
	var self = this;
	var itemCrawler = new ZalandoItemCrawler(configuration, Crawler, Item).Crawler();

	this.configure = function(configuration) {
   	  this.config = configuration;
    };

	this.Crawler = function(){
		return new Crawler({
   		  "maxConnections":10,
    	  "callback": findAndQueueItems
        });
	}

	var findAndQueueItems = function (error,result,$) {
	  if(error == null) {
	     var itemsSelector = "ul.catalog li.gItem";
	     var itemLinkSelector = "a.productBox" ; 
	     $(itemsSelector).each(function() {
	       $(this).find(itemLinkSelector).attr( "href", function( i, href ) {
	        var url = self.config.domain + href;
	        itemCrawler.queue(url);
	       });
	     });
	   }
	};

	this.configure(configuration);
}

function ZalandoItemCrawler(configuration, Crawler, Item) {
	var self = this;

	this.configure = function(configuration) {
   	  this.config = configuration;
    };

  	this.Crawler = function(){
		return new Crawler({
	        "maxConnections":10,
	        "callback": crawlItem
    	});
	}

	var crawlItem = function (error,result,$) {
	  if(error == null) {
	  	var config = self.config;
	    var typeColorSeperator = " - ";
	    var brandSelector = ".productName [itemprop='brand']";
	    var typeAndColorSelector = ".productName [itemprop='name']";
	    var brand = $(brandSelector).text();
	    var typeAndColor = $(typeAndColorSelector).text();
	    var color = typeAndColor.split(typeColorSeperator).pop();
	    var type = typeAndColor.split(typeColorSeperator).slice(0, -1).join(typeColorSeperator);
	    var typeAndColorSplitted = typeAndColor.split(" - ", 2);

	    var priceWithCurrency = $("#articlePrice").text();
	    var oldPriceWithCurrency  = $("#articleOldPrice").text();
	    var price = "";
	    var oldPrice = "";
	    var saving = "";
	    var currency = "€";
	    var priceSplitted = priceWithCurrency.split(" ");
	    if(priceSplitted.length > 1) {
	      price = priceSplitted[0];
	      currency = priceSplitted[1];
	    }

	    var oldPriceSplitted = oldPriceWithCurrency.split(" ");
	    if(oldPriceSplitted.length > 1){
	     oldPrice = oldPriceSplitted[0];
	      var savePriceString = $("#articleSavePrice").text();
	      //save by getting rid of the percentage character at the end 
	      saving = savePriceString.slice(0, -1);
	    }

	    var item = new Item({ 
	      sex: config.gender.name,
	      type: type,
	      color: color,
	      brand: brand,
	      url: result.uri,
	      imageUrls: getImageUrls($),
	      price: price,
	      oldPrice: oldPrice,
	      saving: saving,
	      currency: currency });

	    item.save(function (err, item) {
	      if (err) console.log("item save failed!");
	      else console.log(item.print());
	    });
	  }
	};


	var getImageUrls = function($) {
	  var imageUrls = [];
	  var seperator = " | ";
	  $('div.slide').find('img').each(function(){
	    var src = $(this).attr('src');
	    //console.log("src " + src);
	    imageUrls.push(src);
	  });
	  return imageUrls.join(seperator);
	};

	this.configure(configuration);
}

function Colors() {
	  this.black = ["black", "schwarz", "dark navy", "dark blue", "new black", "noir", "negro",
	   "amarillo bombay", "salt and pepper", "anthracite", "black/gold", "black/white", "jet black", "nero"];

	  this.brown = ["cognac", "rose", "marron", "brown melange", "taupe", "deep taupe", "chocolate",
	   "slush brown", "light toffee", "toffee", "light brown", "brown", "braun", "nougat", "camel",
	   "ethno brown", "caramel", "salbei", "coffee", "khaki", "dark brown", "mokka", "mud", "timber melange",
	    "deep brown", "dunkelbraun", "dark camel", "tobacco", "schoko", "golden brown", "nuts", "bronze"];

	  this.beige = ["beige", "champagne", "nude", "vanilla spice", "vanille", "light beige", "dark beige", "dark sand", "cappuccino"];

	  this.grey =["grey", "grau", "mittelgrau", "mid grey", "dark grey", "grey melange", "dark grey melange", "light grey melange", "glaciar grey", "graphit grey",  "silver", "asphalt",
	  "steel grey"];

	  this.silver = ["silver", "silber", "silver metallic", "gun metal", "phantom", "old silver"];

	  this.white = ["white", "weiß", "ecru", "chalk", "ice", "powder white melange", "offwhite", "sheer white", 
	  "milk", "vollweiß", "vanille", "snow white", "white swan", "ivory", "winter white", "true white", "natural"];

	  this.blue = ["blue", "blau", "hellblau", "dark blue", "fresh blue", "indigo", "sapphire", "blue", "dark blue denim", "medium blue denim",
	   "navy", "indigo melange", "summer night blue", "denim", "light denim","dark navy", "marine", "blue depths", "ink blue", "bright blue",
	   "blu", "eclipse", "cloud blue", "sky blue", "light blue", "dunkelblau"];

	  // very similar to green, can be ignored or merged with green
	  this.petrol = ["petrol", "greenish petrol", "corsair", "ink blue", "heather dark petrol", "petrol"];

	  this.green = ["green", "grün", "dark grün", "hellgrün", , "dunkelgrün", "light green", "dark green", "pine green",
	  "pine", "kombu green", "military green", "verde", "spring green", "bottle green", "basil green", "leaf green",
	  "bright green", "lime", "green grass"];

	  this.olive = ["oliv", "olive", "dark olive", "dusty olive", "olive night", "herb oliv", "wild olive"];

	  this.turquoise = ["türkis", "turquoise", "blue grass", "dark cyan melange" , "dark jade", "light jade", "baltic", "pool green"];

	  this.yellow = ["yellow", "gelb", "mustard", "freesia", "curry", "dark yellow", "lemonade", "chinese yellow", "lemon tonic",
	  "mellow yellow", "citronella", "dark yellow", "blazing yellow", "harvest yellow", "neon gelb", "lemon yellow", "mellow lime"];  

	  this.orange = ["orange", "neon orange", "rust orange", "neon", "nectarine", "nectarin", "melon", "mandarin"];

	  this.red = ["red", "rot", "hellrot", "new red", "berry", "ruby", "old red", "wine red", "dark red", "tomato", "bordeaux",
	  "brilliant red", "rouge"];

	  this.pink = ["pink", "antique pink", "rose", "raspberry", "magenta", "club pink", "dark rose", "intense pink", "pink glow",
	  "dark pink", "bright pink", "hot pink"];  

	  // or lila
	  this.purple = ["purple", "lila", "lilac", "dark berry", "bramble purple", "violet", "violett", "purple magic", "lavender", "aubergine",
	  "ray purple", "blast purple", "" ];

	  this.gold = ["gold", "lightgold", "marigold", "golden", "goldfarben", "goldfarbe", "dark gold"];

	  this.colorful = ["multicolor", "multi", "combo", "multi-coloured", "bunt", "mehrfarbig"];
	};

