const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  department: String,
  tower: String,
  password: String,
  role: String,
  rememberToken: String, // Asegúrate de que este campo existe
});

module.exports = mongoose.model('User', UserSchema);
