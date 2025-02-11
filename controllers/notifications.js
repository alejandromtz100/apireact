const Notification = require('../models/Notification');

// Obtener las notificaciones de un usuario específico
const getUserNotifications = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .populate('userId', 'name') // Solo trae el campo `name` de User
        .populate('montoId', 'description amount date department'); // Trae los campos especificados de Monto
  
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      res.status(500).json({ message: 'Error al obtener notificaciones.' });
    }
  };

const markNotificationAsRead = async (req, res) => {
    try {
      const { notificationId } = req.params; // Obtén el ID de la notificación desde los parámetros de la URL
  
      // Actualiza la notificación para marcarla como leída
      const notification = await Notification.findByIdAndUpdate(
        notificationId, 
        { isRead: true },
        { new: true } // Devuelve la notificación actualizada
      );
  
      if (!notification) {
        return res.status(404).json({ message: "Notificación no encontrada" });
      }
  
      res.status(200).json({ message: "Notificación marcada como leída" });
    } catch (error) {
      console.error("Error al marcar notificación:", error);
      res.status(500).json({ message: "Error al marcar notificación" });
    }
};



module.exports = { getUserNotifications, markNotificationAsRead };
