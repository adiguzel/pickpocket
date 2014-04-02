function ZalandoCrawler(configuration, Crawler, Item) {
    var util = require('util');
    
    this.start = function() {
        configuration.shops.map(function(shop) {
            configuration.colors.map(function(color) {
                configuration.genders.map(function(gender) {
                    gender.clothingTypes.map(function(clothingType) {
                        findAndQueuePages(shop, color, gender, clothingType, configuration);
                    })
                })
            })  
        });
    };

    var findAndQueuePages = function(shop, color, gender, clothingType, config) {
        var genderTypeShopColorUrlPattern = configuration.urlPatterns.genderTypeShopColor.text;
        var domain = config.domain;
        // Url structure for  shop, gender, clothing  and color filtering
        // http://www.zalando.de/genderClothingFilterString/shopFilterString_colorFilter/
        // Ex. : http://www.zalando.de/herrenbekleidung-hemden/esprit.esprit-collection_braun/
        var url = util.format(genderTypeShopColorUrlPattern, domain, clothingType.filter, shop.filter, color.filter) 

        console.log(url);

        function CrawlingConfiguration(){
            this.zalando = config;
            this.shop = shop;
            this.gender = gender;
            this.clothingType = clothingType;
            this.color = color;
            this.domain = domain;
        }

        var paginationExplorer = new ZalandoPaginationExplorer(new CrawlingConfiguration(), Crawler, Item);
        paginationExplorer.queue(url);
    };

    return this;
}

module.exports.ZalandoCrawler = ZalandoCrawler

function CrawlerResultLogger() {

    this.log = function(result) {
        if(result != null) 
            console.log(result.uri)
        else err(result)
    }

    this.err = function(result) {
        var itemDef = "an item";
        if(result != null) {
            itemDef = result.uri;
        }
        console.log("Error occured or redirect requested for " + itemDef)
    }
}

function ZalandoPaginationExplorer(configuration, Crawler, Item) {
    var util = require('util');

    this.queue = function(url) {
        var crawler = new Crawler({
            "maxConnections": configuration.zalando.crawler.maxConnections,
            "callback": onPaginationSamplePageLoad
        });

        crawler.queue(url);
    }

    var onPaginationSamplePageLoad = function(error,result,$) {
        // make sure there are neither any error nor redirects
        if(error == null && result.request._redirectsFollowed == 0) 
            queuePages(result, $) 
        else new CrawlerResultLogger().err(result);
        
    };  

    var queuePages = function(result,$) { 
        var itemFinder = new ZalandoItemFinder(configuration, Crawler, Item);
        var paginatedUrlPattern = configuration.zalando.urlPatterns.paginatedUrl.text;
        var paginationSelector = configuration.zalando.selectors.itemResultsPage.pagination.selector;
        var pageAnchorSelector = configuration.zalando.selectors.itemResultsPage.paginationAnchors.selector;
        var firstPagination = $(paginationSelector).first();
        var pages = firstPagination.find(pageAnchorSelector);

        if(pages.size > 0 ) {
            pages.each(function(page) {
                var paginatedUrl = util.format(paginatedUrlPattern, result.uri, page);
                console.log(paginatedUrl)
                itemFinder.queue(paginatedUrl);
            });  
        }
        else {
            itemFinder.queue(result.uri);
        }
    }; 

}

function ZalandoItemFinder(configuration, Crawler, Item) {
    var util = require('util');

    this.queue = function(url) {
        var crawler = new Crawler({
          "maxConnections": configuration.zalando.crawler.maxConnections,
          "callback": onItemListPageLoad
        });

        crawler.queue(url);
    }

    var onItemListPageLoad = function (error,result,$) {
      // make sure there are neither any error nor redirects
      if(error == null && result.request._redirectsFollowed == 0)
          findAndQueueItems(result, $) 
      else new CrawlerResultLogger().err(result);
    };

    var findAndQueueItems = function (result,$) {
        var itemCrawler = new ZalandoItemCrawler(configuration, Crawler, Item);
        var selectors = getSelectors();
        $(selectors.itemsSelector).each(function() {
           $(this).find(selectors.itemLinkSelector).attr(selectors.itemLinkHrefAttr, function( i, href ) {
            var itemUrlPattern = configuration.zalando.urlPatterns.itemUrl.text;
            var url = util.format(itemUrlPattern, configuration.domain, href);
            itemCrawler.queue(url);
            console.log(url);
           });
        });
    }

    var getSelectors = function() {
        var zalando = configuration.zalando;
        var selectors = new Object();

        selectors.itemsSelector = zalando.selectors.itemResultsPage.items.selector;
        selectors.itemLinkSelector = zalando.selectors.itemResultsPage.itemAnchors.selector;
        selectors.itemLinkHrefAttr = zalando.selectors.itemResultsPage.itemLinkHrefAttr.selector;

        return selectors;
    }

}

function ZalandoItemCrawler(configuration, Crawler, Item) {

    this.queue = function(url) {
        var crawler = new Crawler({
            "maxConnections": configuration.zalando.crawler.maxConnections,
            "callback": onItemPageLoad
        });

        crawler.queue(url);
    }

    var onItemPageLoad = function (error,result,$) {
        // make sure there arree neither any error nor redirects
        if(error == null && result.request._redirectsFollowed == 0)
            tryCrawlAndSaveItem(result, $)
        else 
            console.log("Error occured or redirect requested for " + result.uri)
    };

    var tryCrawlAndSaveItem = function (result,$) { 
        var item = crawlItem(result, $);

        Item.find({ url: result.uri }, function (err, items) {
           if (err) {
              console.log("Querying failed not crawling : " + result.uri)
           }
           else if(items.length > 0){
              console.log("An item with the following url already exists : " + result.uri)
           }
           else { //Attempt to save the item only if it is not already in the db
              item.save(function (err, item) {
                  if (err) console.log("Item could not be persisted!");
                  else console.log(item.print());
              });
           }  
        });
    }

    var crawlItem = function(result, $) { 
        var selectors = getSelectors();
        var seperators = getSeperators();

        var brand = $(selectors.brand).text();
        var typeAndColor = $(selectors.typeAndColor).text();
        var colorText = typeAndColor.split(seperators.typeAndColor).pop();
        var typeText = typeAndColor.split(seperators.typeAndColor).slice(0, -1).join(seperators.typeAndColor);
        var oldPriceWithCurrency  = $(selectors.oldPriceWithCurrency).text();
        var price = extractPrice($(selectors.priceWithCurrency).text(), seperators);
        var oldPrice = extractPrice($(selectors.oldPriceWithCurrency).text(), seperators);
        var currency = extractCurrency($(selectors.priceWithCurrency).text(), seperators);
        //get rid of the percentage character at the end
        var saving = $(selectors.saving).text().slice(0, -1);

        return new Item({ 
          gender: configuration.gender.category,
          type: configuration.clothingType.category,
          typeText: typeText,
          color: configuration.color.category,
          colorText: colorText,
          brand: brand,
          url: result.uri,
          imageUrls: getItemImageUrls($, selectors, seperators),
          price: price,
          oldPrice: oldPrice,
          saving: saving,
          currency: currency 
        });
    }

    var getSelectors = function() {
        var zalando = configuration.zalando;
        var selectors = new Object();

        selectors.brand =  zalando.selectors.itemPage.brand.selector;
        selectors.typeAndColor = zalando.selectors.itemPage.typeAndColor.selector;
        selectors.priceWithCurrency = zalando.selectors.itemPage.priceWithCurrency.selector;
        selectors.oldPriceWithCurrency = zalando.selectors.itemPage.oldPriceWithCurrency.selector;
        selectors.saving = zalando.selectors.itemPage.saving.selector;
        selectors.imageSlide = zalando.selectors.itemPage.imageSlide.selector;
        selectors.image = zalando.selectors.itemPage.image.selector;
        selectors.imageSource = zalando.selectors.itemPage.imageSource.selector;

        return selectors;
    }

    var getSeperators = function() {
        var zalando = configuration.zalando;
        var seperators = new Object();

        seperators.imageSources =  zalando.seperators.itemPage.imageSources.seperator;
        seperators.typeAndColor =  zalando.seperators.itemPage.typeAndColor.seperator;
        seperators.priceAndCurrency =  zalando.seperators.itemPage.priceAndCurrency.seperator;

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

}

