const mongoose = require('mongoose');

const WhatsSchema = new mongoose.Schema({
    phoneNumber: { 
        type: String, 
        required: true, 
    },
    token: { 
        type: String, 
        required: true, 
    }
}, {
    timestamps: true, // Añade campos createdAt y updatedAt
});

module.exports = mongoose.model('Whats', WhatsSchema);