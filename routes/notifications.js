const express = require('express');
const { getUserNotifications, markNotificationAsRead } = require('../controllers/notifications'); 
const router = express.Router();

// Ruta para obtener las notificaciones de un usuario
router.get('/:userId', getUserNotifications);

// Ruta para marcar una notificación como leída
router.put("/:notificationId", markNotificationAsRead);

module.exports = router;
