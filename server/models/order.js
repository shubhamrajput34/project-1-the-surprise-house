const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customer: {
    name: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  items: [
    {
      productId: String,
      title: String,
      quantity: { type: Number, default: 1 },
      price: Number,
      customNote: String
    }
  ],
  billing: {
    subtotal: Number,
    deliveryFee: Number,
    total: Number
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'cod'],
    required: true
  },
  status: {
    type: String,
    default: 'Placed',
    enum: ['Placed', 'Packed', 'Out for delivery', 'Delivered', 'Cancelled']
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
