// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  whatsappNumber: {
    type: String,
    required:true,
  },
  dob: {
    type: Date,  // Use Date type for storing dates
    required: true,  // Set this to true if DOB should be required
  },
});

module.exports = mongoose.model('User', userSchema);
