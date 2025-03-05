const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Whats = require('../models/Whats');
const User = require('../models/User'); // Importa el modelo de Usuario

// Configuración de la API de WhatsApp Business
const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta';

// Función para generar un token JWT con duración de 5 minutos
const generateToken = (phoneNumber) => {
  return jwt.sign({ phoneNumber }, JWT_SECRET, { expiresIn: '5m' });
};

// Ruta pública para enviar mensajes de WhatsApp
router.post('/send-whatsapp', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber es requerido' });
  }

  try {
    // Generar un token JWT
    const token = generateToken(phoneNumber);

    // Guardar el token en la base de datos
    const newWhats = new Whats({
      phoneNumber,
      token,
    });
    await newWhats.save();

    // Este será el texto que irá en el botón del template
    const resetUrl = `${token}`;

    // Enviar el mensaje de WhatsApp
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'resta',
          language: { code: 'en' },
          components: [
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [
                {
                  type: 'text',
                  text: resetUrl,
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Mensaje enviado:', response.data);
    res.status(200).json({ success: true, data: response.data, token });
  } catch (error) {
    console.error(
      'Error al enviar el mensaje:',
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      success: false,
      error: error.response ? error.response.data : error.message,
    });
  }
});

// Ruta para verificar el token
router.post('/verify-token', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token es requerido' });
  }

  try {
    // Verificar el JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Extraer el número de teléfono del token decodificado
    const { phoneNumber } = decoded;

    // Buscar el usuario en la colección de usuarios usando el número de teléfono
    const usuario = await User.findOne({ phone: phoneNumber });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Si todo está bien, devolver un mensaje de éxito
    res.status(200).json({ message: 'Token válido' });
  } catch (error) {
    console.error(error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }

    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta para actualizar contraseña
router.post('/update-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { phoneNumber } = decoded;

    // Buscar al usuario por el número de teléfono
    const usuario = await User.findOne({ phone: phoneNumber });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar la contraseña del usuario
    usuario.password = newPassword; // Asegúrate de hashear la contraseña antes de guardarla
    await usuario.save();

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error(error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }

    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
