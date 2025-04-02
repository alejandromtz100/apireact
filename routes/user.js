const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Asegúrate de que la ruta sea correcta
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'alejandro.martinez.22s@utzmg.edu.mx',
    pass: 'drwd culc brhe orrs' // Usa tu contraseña de aplicación
  }
});

// Objeto temporal para almacenar tokens de recuperación
const resetTokens = {}

// Configuración de la clave secreta para JWT (idealmente en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'dijiste_la_clave';

// Blacklist de tokens (no es escalable para producción, solo para demostración)
const tokenBlacklist = [];

/**
 * Middleware para verificar el token.
 * Se espera que el token se envíe en el header 'Authorization'.
 * Además, se verifica que el token no esté en la blacklist.
 */
const verifyToken = async (req, res, next) => {
  const token = req.header('Authorization') || req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar si el usuario tiene un rememberToken en la base de datos y coincide
    const user = await User.findById(decoded.id);
    if (!user || (user.rememberToken && user.rememberToken !== token)) {
      return res.status(401).json({ message: 'Token no válido o expirado. Por favor, inicie sesión nuevamente.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Token inválido' });
  }
};

/**
 * Ruta para buscar un usuario por nombre (no protegida)
 */
router.get('/search', async (req, res) => {
  const { name } = req.query;
  try {
    // Se usa una expresión regular para hacer la búsqueda sin distinción de mayúsculas/minúsculas
    const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al buscar el usuario', error: err.message });
  }
});

/**
 * Ruta para obtener un usuario por ID (protegida)
 */
router.get('/me/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el usuario', error: err.message });
  }
});

/**
 * Ruta para el login
 * Se verifica la existencia del usuario y se compara la contraseña utilizando bcrypt.
 * Si es correcto, se genera y devuelve un JWT.
 */
router.post('/login', async (req, res) => {
  const { phoneNumber, password, rememberMe } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'Número de teléfono y contraseña son requeridos' });
  }

  try {
    // Busca al usuario por número de teléfono
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Compara la contraseña ingresada con la contraseña encriptada almacenada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Define la expiración del token basado en la opción "Recordar en este dispositivo"
    const expiresIn = rememberMe ? '30d' : '1h'; // 30 días o 1 hora

    // Genera el token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn }
    );

    // Si el usuario selecciona "Recordar en este dispositivo", guarda el token en la base de datos
    if (rememberMe) {
      user.rememberToken = token;
      await user.save();
    }

    res.status(200).json({ message: 'Login exitoso', token, user });
  } catch (err) {
    res.status(500).json({ message: 'Error durante el login', error: err.message });
  }
});

/**
 * Ruta para registrar un nuevo usuario.
 * La contraseña se encripta utilizando bcrypt antes de guardarla.
 */
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, department, tower, password, role } = req.body;

    // Genera un "salt" y encripta la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      phoneNumber,
      department,
      tower,
      password: hashedPassword,
      role
    });      

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: 'Error al crear el usuario', error: err.message });
  }
});

/**
 * Ruta para eliminar un usuario por ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json({ message: 'Usuario eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el usuario', error: err.message });
  }
});

/**
 * Ruta para obtener todos los usuarios (protegida)
 */
router.get('/all', verifyToken, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener los usuarios', error: err.message });
  }
});

/**
 * Ruta para actualizar parcialmente un usuario por ID (protegida)
 */
router.patch('/update/:id', verifyToken, async (req, res) => {
  try {
    const updateFields = { ...req.body };

    // Si se envía una nueva contraseña, encriptarla
    if (updateFields.password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(updateFields.password, salt);
    }

    // Forzar el cierre de sesión eliminando el rememberToken
    updateFields.rememberToken = null;

    // Actualizar el usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({ message: 'Usuario actualizado. Por favor, inicie sesión nuevamente.', updatedUser });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar el usuario', error: err.message });
  }
});

/**
 * Ruta para el logout.
 * Se utiliza el middleware verifyToken para asegurar que se envíe un token válido.
 * Luego se agrega el token a la blacklist para invalidarlo.
 */
router.post('/logout', verifyToken, async (req, res) => {
  const token = req.header('Authorization') || req.cookies.token;

  // Agregar a la blacklist para invalidarlo temporalmente
  tokenBlacklist.push(token);

  // Eliminar el token de la base de datos
  const user = await User.findById(req.user.id);
  if (user) {
    user.rememberToken = null;
    await user.save();
  }

  res.status(200).json({ message: 'Sesión cerrada con éxito' });
});





router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Correo electrónico es requerido' });
  }

  try {
    // Buscar usuario por email (asumiendo que el modelo User tiene campo email)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No existe un usuario con este correo electrónico' });
    }

    // Generar token único
    const token = crypto.randomBytes(20).toString('hex');
    
    // Guardar token temporalmente (en producción usa una base de datos)
    resetTokens[token] = {
      userId: user._id,
      expires: Date.now() + 3600000 // 1 hora de expiración
    };

    // Crear enlace de recuperación
    const resetLink = `https://proyectoceleste.vercel.app/restablecer/${token}`;

    // Configurar correo electrónico
    const mailOptions = {
      from: 'alejandro.martinez.22s@utzmg.edu.mx',
      to: email,
      subject: 'Recuperación de Contraseña',
      html: `
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Por favor haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Si no solicitaste este cambio, por favor ignora este correo.</p>
        <p>El enlace expirará en 1 hora.</p>
      `
    };

    // Enviar correo
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña' });
  } catch (err) {
    res.status(500).json({ message: 'Error al procesar la solicitud', error: err.message });
  }
});

/**
 * Ruta para verificar token de recuperación
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Token es requerido' });
  }

  try {
    const tokenData = resetTokens[token];

    if (!tokenData) {
      return res.status(404).json({ message: 'Token inválido' });
    }

    if (tokenData.expires < Date.now()) {
      delete resetTokens[token];
      return res.status(400).json({ message: 'Token ha expirado' });
    }

    res.status(200).json({ message: 'Token válido' });
  } catch (err) {
    res.status(500).json({ message: 'Error al verificar el token', error: err.message });
  }
});

/**
 * Ruta para restablecer la contraseña
 */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
  }

  try {
    const tokenData = resetTokens[token];

    if (!tokenData) {
      return res.status(404).json({ message: 'Token inválido' });
    }

    if (tokenData.expires < Date.now()) {
      delete resetTokens[token];
      return res.status(400).json({ message: 'Token ha expirado' });
    }

    // Buscar usuario
    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar contraseña y eliminar rememberToken
    user.password = hashedPassword;
    user.rememberToken = null;
    await user.save();

    // Eliminar token usado
    delete resetTokens[token];

    res.status(200).json({ message: 'Contraseña restablecida con éxito' });
  } catch (err) {
    res.status(500).json({ message: 'Error al restablecer la contraseña', error: err.message });
  }
});

module.exports = router;