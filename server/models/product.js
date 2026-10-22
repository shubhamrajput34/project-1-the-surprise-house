const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  quote: String,
  description: String,
  images: [String],
  inStock: { type: Boolean, default: true }
});

module.exports = mongoose.model('Product', ProductSchema);
