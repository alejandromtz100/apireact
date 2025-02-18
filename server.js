const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Cors = require('cors');
const userRoutes = require('./routes/user');
const montosRoutes = require('./routes/montos');
const notificationsRoutes = require('./routes/notifications'); 
const verificarToken = require("./middleware/verificartoken");
const allowedOrigins = ['https://proyectoceleste.vercel.app' , 'http://localhost:5173'];


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
      next();
  } else {
      res.status(403).json({ error: 'Acceso no permitido' });
  }
});

// Middleware
app.use(Cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/montos', verificarToken, montosRoutes);
app.use('/api/notifications', verificarToken, notificationsRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error(err));

// Rutas básicas
app.get('/', (req, res) => {
  res.send('Bienvenido a mi API');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

