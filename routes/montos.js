const express = require('express');
const moment = require('moment'); // Importar moment para formatear fechas
const Monto = require('../models/Montos'); // Importar el modelo de Monto
const Notification = require('../models/Notification'); // Importar el modelo de Notification
const User = require('../models/User'); // Importar el modelo de User

const router = express.Router();

// Middleware para validar campos requeridos
const validateMontoFields = (req, res, next) => {
  const { name, amount, date } = req.body;
  if (!name || !amount || !date) {
    return res.status(400).json({ error: 'Los campos name, amount y date son obligatorios' });
  }
  next();
};

// Crear un monto
router.post('/register', validateMontoFields, async (req, res) => {
  try {
    const { name, description, amount, date, department, tower } = req.body;

    const newMonto = new Monto({
      name,
      description,
      amount,
      date,
      department,
      tower,
    });

    await newMonto.save();

    // Enviar notificaciones a los usuarios correspondientes
    if (department && tower) {
      const users = await User.find({ department, tower });
      const notifications = users.map(user => ({
        userId: user._id,
        montoId: newMonto._id,
        message: `Se ha registrado un nuevo monto: ${name}.`,
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      message: 'Monto creado exitosamente',
      monto: newMonto,
    });
  } catch (error) {
    res.status(400).json({ error: `Error al crear el monto: ${error.message}` });
  }
});

// Obtener todos los montos
router.get('/mostrar', async (req, res) => {
  try {
    const montos = await Monto.find();
    const formattedMontos = montos.map(monto => ({
      ...monto._doc,
      date: moment(monto.date).format('YYYY-MM-DD'), // Formatear la fecha
    }));
    res.status(200).json(formattedMontos);
  } catch (error) {
    res.status(500).json({ error: `Error al obtener los montos: ${error.message}` });
  }
});

// Obtener un monto por ID
router.get('/:id', async (req, res) => {
  try {
    const monto = await Monto.findById(req.params.id);
    if (!monto) {
      return res.status(404).json({ error: 'Monto no encontrado' });
    }
    const formattedMonto = {
      ...monto._doc,
      date: moment(monto.date).format('YYYY-MM-DD HH:mm:ss'), // Formatear la fecha
    };
    res.status(200).json(formattedMonto);
  } catch (error) {
    res.status(500).json({ error: `Error al obtener el monto: ${error.message}` });
  }
});

// Actualizar un monto por ID
router.put('/:id', validateMontoFields, async (req, res) => {
  try {
    const { name, description, amount, date, department, tower } = req.body;

    const updatedMonto = await Monto.findByIdAndUpdate(
      req.params.id,
      { name, description, amount, date, department, tower },
      { new: true, runValidators: true }
    );

    if (!updatedMonto) {
      return res.status(404).json({ error: 'Monto no encontrado' });
    }

    // Enviar notificaciones a los usuarios correspondientes
    if (department && tower) {
      const users = await User.find({ department, tower });
      const notifications = users.map(user => ({
        userId: user._id,
        montoId: updatedMonto._id,
        message: `El monto ${name} ha sido actualizado.`,
      }));
      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      message: 'Monto actualizado exitosamente',
      monto: updatedMonto,
    });
  } catch (error) {
    res.status(400).json({ error: `Error al actualizar el monto: ${error.message}` });
  }
});

// Eliminar un monto por ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedMonto = await Monto.findByIdAndDelete(req.params.id);
    if (!deletedMonto) {
      return res.status(404).json({ error: 'Monto no encontrado' });
    }

    // Eliminar notificaciones relacionadas con el monto
    await Notification.deleteMany({ montoId: deletedMonto._id });

    res.status(200).json({ message: 'Monto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: `Error al eliminar el monto: ${error.message}` });
  }
});

module.exports = router;
