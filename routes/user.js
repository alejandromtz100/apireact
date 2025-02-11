const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Asegúrate de que la ruta sea correcta


router.get('/search', async (req, res) => {
  const { name } = req.query;
  try {
    const user = await User.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al buscar el usuario', error: err.message });
  }
});


// Obtener un usuario por ID
router.get('/me:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el usuario', error: err.message });
  }
});

// Ruta para el login
router.post('/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  // Verifica que se envíen ambos campos
  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'Número de teléfono y contraseña son requeridos' });
  }

  try {
    // Busca al usuario por número de teléfono
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verifica que la contraseña coincida
    if (user.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Login exitoso
    res.status(200).json({ message: 'Login exitoso', user });
  } catch (err) {
    res.status(500).json({ message: 'Error durante el login', error: err.message });
  }
});

// Crear un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { name, phoneNumber, department, tower, password, role } = req.body;
    const newUser = new User({ name, phoneNumber, department, tower, password, role });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ message: 'Error al crear el usuario', error: err.message });
  }
});

// Actualizar un usuario por ID
router.put('/:id', async (req, res) => {
  try {
    const { name, phoneNumber, department, tower, password, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, phoneNumber, department, tower, password, role },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar el usuario', error: err.message });
  }
});

// Eliminar un usuario por ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.status(200).json({ message: 'Usuario eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el usuario', error: err.message });
  }
});

router.post('/logout', (req, res) => {
  // Lógica adicional para sesiones/tokens si es necesario
  res.status(200).json({ message: 'Sesión cerrada con éxito' });
});


module.exports = router;
