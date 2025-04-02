const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Campo de correo agregado
  department: { type: String, required: true },
  tower: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'user'], default: 'user' },
  rememberToken: { type: String, default: null }
});

module.exports = mongoose.model('User', userSchema);
