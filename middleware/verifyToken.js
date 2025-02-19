// middlewares/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Se espera que el token llegue en el header Authorization en formato "Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  try {
    // Verifica el token utilizando la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Puedes guardar la información del usuario en req.user si la necesitas en otros endpoints
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token no es válido' });
  }
};

module.exports = verifyToken;
