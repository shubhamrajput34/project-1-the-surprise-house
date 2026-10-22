const mongoose = require('mongoose');

const CustomizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  product: { type: String, required: true },
  idea: { type: String },
  imagePath: { type: String },
  status: { 
    type: String, 
    default: 'Pending', 
    enum: ['Pending', 'Reviewed', 'In Progress', 'Completed'] 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customization', CustomizationSchema);
