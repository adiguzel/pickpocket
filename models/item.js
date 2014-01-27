function Item(mongoose) {
    // Define an Item model
    var ItemSchema = mongoose.Schema({
      gender     : String,
      type       : String, //type category
      typeText   : String, //original type text on the product page
      color      : String, //color category
      colorText	 : String, //original color text on the product page
      brand		   : String,
      url        : String,
      imageUrls  : String,
      price      : String,
      oldPrice   : String,
      saving     : String,
      currency   : String,
      date 		   : { type: Date, default: Date.now }
    });

    ItemSchema.methods.print = function () {
	    return this.gender + ' | ' +
	    "price " + this.price + " " + this.currency + ' | ' +  
	    "old price " + this.oldPrice + " " + this.currency + ' | ' +
	    "saving " + this.saving + "%" + ' | ' + this.type + ' | '  + 
      this.typeText + ' | ' + this.color + ' | ' + this.colorText + ' | ' +
      this.brand + ' | ' + this.url +  ' | ' + this.imageUrls + "\n";
    };

    return mongoose.model('Item', ItemSchema);
}

module.exports.Item = Item;