function Item(mongoose) {
    // Define an Item model
    var ItemSchema = mongoose.Schema({
      sex        : String,
      type 		   : String,
      color		   : String,
      brand		   : String,
      url        : String,
      imageUrls  : String,
      price      : String,
      oldPrice   : String,
      saving       : String,
      currency   : String,
      date 		   : { type: Date, default: Date.now }
    });

    ItemSchema.methods.print = function () {
	    return this.sex + ' | ' +
	    "price " + this.price + " " + this.currency + ' | ' +  
	    "old price " + this.oldPrice + " " + this.currency + ' | ' +
	    "saving " + this.saving + "%" + ' | ' +
	    this.type + ' | ' + this.color + ' | ' + this.brand + ' | ' + this.url +  ' | ' + this.imageUrls + "\n";
    };

    return mongoose.model('Item', ItemSchema);
}

module.exports.Item = Item;