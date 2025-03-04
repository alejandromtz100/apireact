const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  tower: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }, // Asegúrate de que el rol tenga un valor por defecto
  rememberToken: { type: String, default: null }
});

module.exports = mongoose.model('User', UserSchema);
