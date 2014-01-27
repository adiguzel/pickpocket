function ZalandoCrawler(configuration, Crawler, Item) {
	var self = this;
	var util = require('util');

	this.configure = function(configuration) {
   	  this.config = configuration;
   	  this.genderShopColorUrlPattern = configuration.urlPatterns.genderShopColor.text;
    };
	
	this.crawl = function() {
		var config = this.config;
		var genderShopColorUrlPattern = this.genderShopColorUrlPattern;
		config.shops.map(function(shop){
			config.genders.map(function(gender){
				config.colors.map(function(color){
					var domain = config.domain;
					// Url structure for  shop ,gender clothing  and color filtering
					// http://www.zalando.de/genderClothingFilterString/shopFilterString_colorFilter/
					// Ex : http://www.zalando.de/herrenbekleidung/esprit.esprit-collection_braun/
					var url = util.format(genderShopColorUrlPattern, domain, gender.clothingFilter, shop.filter, color.filter) 
					console.log(url);
					function Configuration(config, shop, gender, color, domain){
						this.zalando = config;
						this.shop = shop;
						this.gender = gender;
						this.color = color;
						this.domain = domain;
					}
					var paginationExplorer = new ZalandoPaginationExplorer(new Configuration(config, shop, gender, color, domain), Crawler, Item).Crawler();
					paginationExplorer.queue(url);
				})
			})
		});
	};

	this.configure(configuration);
	return this;
}

module.exports.ZalandoCrawler = ZalandoCrawler

function ZalandoPaginationExplorer(configuration, Crawler, Item) {
	var self = this;
	var itemFinder = new ZalandoItemFinder(configuration, Crawler, Item).Crawler();
	var util = require('util');

	this.configure = function(configuration) {
   	  this.config = configuration;
    };

	this.Crawler = function() {
		return new Crawler({
		    "maxConnections":10,
		    "callback": queuePages
		});
	}

	var queuePages = function(error,result,$) { 
	  if(error == null) {
	  	var paginatedUrlPattern = self.config.zalando.urlPatterns.paginatedUrl.text;
	  	var paginationSelector = self.config.zalando.selectors.itemResultsPage.pagination.selector;
	    var pageAnchorSelector = self.config.zalando.selectors.itemResultsPage.paginationAnchors.selector;
	    var firstPagination = $(paginationSelector).first();
	    var pages = firstPagination.find(pageAnchorSelector);

	    pages.each(function(page) {
	      var paginatedUrl = util.format(paginatedUrlPattern, result.uri, page);
	      console.log(paginatedUrl)
	      itemFinder.queue(paginatedUrl);
	    });
	  }
	};	

	this.configure(configuration);
}

function ZalandoItemFinder(configuration, Crawler, Item) {
	var self = this;
	var itemCrawler = new ZalandoItemCrawler(configuration, Crawler, Item).Crawler();
	var util = require('util');

	this.configure = function(configuration) {
   	  this.config = configuration;
    };

	this.Crawler = function(){
		return new Crawler({
   		  "maxConnections":10,
    	  "callback": findAndQueueItems
        });
	}

	var getSelectors = function() {
		var config = self.config;
		var selectors = new Object();
	  	selectors.itemsSelector = config.zalando.selectors.itemResultsPage.items.selector;
	    selectors.itemLinkSelector = config.zalando.selectors.itemResultsPage.itemAnchors.selector;
	    selectors.itemLinkHrefAttr = config.zalando.selectors.itemResultsPage.itemLinkHrefAttr.selector;
		return selectors;
	}

	var findAndQueueItems = function (error,result,$) {
	  if(error == null) {
	  	var selectors = getSelectors();
	    $(selectors.itemsSelector).each(function() {
	       $(this).find(selectors.itemLinkSelector).attr(selectors.itemLinkHrefAttr, function( i, href ) {
	       	var itemUrlPattern = self.config.zalando.urlPatterns.itemUrl.text;
	       	var url = util.format(itemUrlPattern, self.config.domain, href);
	        console.log(url)
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
	        "callback": crawlAndPersistItem
    	});
	}

	var getSelectors = function() {
		var config = self.config;
		var selectors = new Object();
		selectors.brand =  config.zalando.selectors.itemPage.brand.selector;
		selectors.typeAndColor = config.zalando.selectors.itemPage.typeAndColor.selector;
		selectors.priceWithCurrency = config.zalando.selectors.itemPage.priceWithCurrency.selector;
		selectors.oldPriceWithCurrency = config.zalando.selectors.itemPage.oldPriceWithCurrency.selector;
		selectors.saving = config.zalando.selectors.itemPage.saving.selector;
		selectors.imageSlide = config.zalando.selectors.itemPage.imageSlide.selector;
		selectors.image = config.zalando.selectors.itemPage.image.selector;
		selectors.imageSource = config.zalando.selectors.itemPage.imageSource.selector;
		return selectors;
	}

	var getSeperators = function() {
		var config = self.config;
		var seperators = new Object();
		seperators.imageSources =  config.zalando.seperators.itemPage.imageSources.seperator;
		seperators.typeAndColor =  config.zalando.seperators.itemPage.typeAndColor.seperator;
		seperators.priceAndCurrency =  config.zalando.seperators.itemPage.priceAndCurrency.seperator;
		return seperators;
	}

	var extractPrice = function(priceWithCurrency, seperators) {
		var price = "";
		var priceSplitted = priceWithCurrency.split(seperators.priceAndCurrency);
		 if(priceSplitted.length > 1) {
	      price = priceSplitted[0];
	    }

	    return price;
	}

	var extractCurrency = function(priceWithCurrency, seperators) {
		var currency = "";
		var priceSplitted = priceWithCurrency.split(seperators.priceAndCurrency);
		 if(priceSplitted.length > 1) {
	      currency = priceSplitted[1];
	    }

	    return currency;
	}

	var getItemImageUrls = function($, selectors, seperators) {
	  var imageUrls = [];
	  $(selectors.imageSlide).find(selectors.image).each(function(){
	    var src = $(this).attr(selectors.imageSource);
	    imageUrls.push(src);
	  });
	  return imageUrls.join(seperators.imageSources);
	};

	var crawlItem = function(result, $) { 
		var selectors = getSelectors();
		var seperators = getSeperators();

		var brand = $(selectors.brand).text();
	    var typeAndColor = $(selectors.typeAndColor).text();
	    var color = typeAndColor.split(seperators.typeAndColor).pop();
	    var type = typeAndColor.split(seperators.typeAndColor).slice(0, -1).join(seperators.typeAndColor);
	    var oldPriceWithCurrency  = $(selectors.oldPriceWithCurrency).text();
	    var price = extractPrice($(selectors.priceWithCurrency).text(), seperators);
	    var oldPrice = extractPrice($(selectors.oldPriceWithCurrency).text(), seperators);
	    var currency = extractCurrency($(selectors.priceWithCurrency).text(), seperators);
	    //get rid of the percentage character at the end
	    var saving = $(selectors.saving).text().slice(0, -1);

	    return new Item({ 
	      sex: self.config.gender.name,
	      type: type,
	      color: color,
	      brand: brand,
	      url: result.uri,
	      imageUrls: getItemImageUrls($, selectors, seperators),
	      price: price,
	      oldPrice: oldPrice,
	      saving: saving,
	      currency: currency });
	}

	var crawlAndPersistItem = function (error,result,$) {
	  if(error == null) {
	    var item = crawlItem(result, $);
	    item.save(function (err, item) {
	      if (err) console.log("item save failed!");
	      else console.log(item.print());
	    });
	  }
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

