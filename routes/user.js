const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Asegúrate de que la ruta sea correcta

// Configuración de la clave secreta para JWT (idealmente en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'dijiste_la_clave';

// Blacklist de tokens (no es escalable para producción, solo para demostración)
const tokenBlacklist = [];

/**
 * Middleware para verificar el token.
 * Se espera que el token se envíe en el header 'Authorization'.
 * Además, se verifica que el token no esté en la blacklist.
 */
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization') || req.cookies.token; // Verifica el token en el header o en las cookies
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
  }

  // Verifica si el token fue invalidado (logout)
  if (tokenBlacklist.includes(token)) {
    return res.status(401).json({ message: 'Token ha sido invalidado. Inicie sesión de nuevo.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Agregamos la info del usuario al request
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
    // Copiamos los campos que se desean actualizar
    const updateFields = { ...req.body };

    // Si se envía una nueva contraseña, se encripta
    if (updateFields.password) {
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(updateFields.password, salt);
    }

    // Actualizamos el usuario con los campos enviados
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json(updatedUser);
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
  tokenBlacklist.push(token);

  // Eliminar el token de la base de datos si existe
  const user = await User.findById(req.user.id);
  if (user && user.rememberToken === token) {
    user.rememberToken = null;
    await user.save();
  }

  res.status(200).json({ message: 'Sesión cerrada con éxito' });
});

module.exports = router;