const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true},
  department: { type: String, required: true },
  tower: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'user'], default: 'user' },
});

module.exports = mongoose.model('User', userSchema);
