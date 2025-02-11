const mongoose = require('mongoose');

// Definir el esquema de Monto
const montoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  department: { type: String, required: true },
  tower: { type: String, required: true },
}, { timestamps: true });

// Exportar el modelo de Monto
module.exports = mongoose.model('Monto', montoSchema);
