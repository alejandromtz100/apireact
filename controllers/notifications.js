const express = require('express');
const Notification = require('../models/Notification');
const verifyToken = require('../middlewares/verifyToken'); // Importa el middleware

const router = express.Router();

// Obtener las notificaciones de un usuario específico (requiere token)
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name')
      .populate('montoId', 'description amount date department');

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones.' });
  }
});

// Marcar notificación como leída (requiere token)
router.put('/:notificationId', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    res.status(200).json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error al marcar notificación:", error);
    res.status(500).json({ message: "Error al marcar notificación" });
  }
});

module.exports = router;
