const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Cors = require('cors');
const userRoutes = require('./routes/user');
const montosRoutes = require('./routes/montos');
const notificationsRoutes = require('./routes/notifications'); 




dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;



// Middleware
app.use(Cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/montos', montosRoutes);
app.use('/api/notifications', notificationsRoutes);


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

