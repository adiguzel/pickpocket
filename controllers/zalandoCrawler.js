function ZalandoCrawler(configuration, Crawler, Item) {
    var self = this;
    var util = require('util');

    this.configure = function(configuration) {
        this.config = configuration;
        this.genderTypeShopColorUrlPattern = configuration.urlPatterns.genderTypeShopColor.text;
    };
    
    this.start = function() {
        var config = this.config;
        config.shops.map(function(shop) {
            config.colors.map(function(color) {
                config.genders.map(function(gender) {
                    gender.clothingTypes.map(function(clothingType) {
                        findAndQueuePages(shop, color, gender, clothingType, config);
                    })
                })
            })  
        });
    };

    var findAndQueuePages = function(shop, color, gender, clothingType, config) {
        var genderTypeShopColorUrlPattern = self.genderTypeShopColorUrlPattern;
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

        var paginationExplorer = new ZalandoPaginationExplorer(new CrawlingConfiguration(), Crawler, Item).Crawler();
        paginationExplorer.queue(url);
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
            "maxConnections": configuration.zalando.crawler.maxConnections,
            "callback": onPaginationSamplePageLoad
        });
    } 

    var onPaginationSamplePageLoad = function(error,result,$) {
        // make sure there are neither any error nor redirects
        if(error == null && result.request._redirectsFollowed == 0) {
            queuePages(result, $) 
        } 
        else{ 
            var itemDef = "an item";
            if(result != null) {
                itemDef = result.uri;
            }
            console.log("error occured or redirect requested for " + itemDef)
        }
    };  

    var queuePages = function(result,$) { 
        var paginatedUrlPattern = self.config.zalando.urlPatterns.paginatedUrl.text;
        var paginationSelector = self.config.zalando.selectors.itemResultsPage.pagination.selector;
        var pageAnchorSelector = self.config.zalando.selectors.itemResultsPage.paginationAnchors.selector;
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
          "maxConnections": configuration.zalando.crawler.maxConnections,
          "callback": onItemListPageLoad 
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

    var findAndQueueItems = function (result,$) {
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

    var onItemListPageLoad = function (error,result,$) {
      // make sure there are neither any error nor redirects
      if(error == null && result.request._redirectsFollowed == 0)
          findAndQueueItems(result, $) 
      else 
          console.log("error occured or redirect requested for " + result.uri)
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
            "maxConnections": configuration.zalando.crawler.maxConnections,
            "callback": onItemPageLoad
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
        var colorText = typeAndColor.split(seperators.typeAndColor).pop();
        var typeText = typeAndColor.split(seperators.typeAndColor).slice(0, -1).join(seperators.typeAndColor);
        var oldPriceWithCurrency  = $(selectors.oldPriceWithCurrency).text();
        var price = extractPrice($(selectors.priceWithCurrency).text(), seperators);
        var oldPrice = extractPrice($(selectors.oldPriceWithCurrency).text(), seperators);
        var currency = extractCurrency($(selectors.priceWithCurrency).text(), seperators);
        //get rid of the percentage character at the end
        var saving = $(selectors.saving).text().slice(0, -1);

        return new Item({ 
          gender: self.config.gender.category,
          type: self.config.clothingType.category,
          typeText: typeText,
          color: self.config.color.category,
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

    var tryCrawlAndSaveItem = function (result,$) { 
        var item = crawlItem(result, $);

        Item.find({ url: result.uri }, function (err, items) {
           if (err) {
              console.log("Querying failed not crawling : " + result.uri)
           }
           else if(items.length > 0){
              console.log("There is already an item with the following url : " + result.uri)
           }
           else { //Attempt to save the item only if it is not already in the db
              item.save(function (err, item) {
                  if (err) console.log("Item could not be persisted!");
                  else console.log(item.print());
              });
           }  
        });
    }

    var onItemPageLoad = function (error,result,$) {
        // make sure there arree neither any error nor redirects
        if(error == null && result.request._redirectsFollowed == 0)
            tryCrawlAndSaveItem(result, $)
        else 
            console.log("error occured or redirect requested for " + result.uri)
    };

    this.configure(configuration);
}

