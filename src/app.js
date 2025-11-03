const { swaggerDocs } = require('./swagger');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const requireAuth = require('./middlewares/requireAuth');
const productRoutes = require('./routes/productRoutes');
const compraRoutes = require('./routes/compraRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const predecirRoutes = require('./routes/predecirRoutes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/productos', requireAuth, productRoutes);
app.use('/api/compras', requireAuth, compraRoutes);
app.use('/api/ventas', requireAuth, ventaRoutes);
app.use('/api/reportes', requireAuth, reporteRoutes);
app.use('/api/predecir', requireAuth,predecirRoutes);

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, nombre_usuario, nombre_completo FROM usuario WHERE id = ?',
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    const { id, nombre_usuario, nombre_completo } = rows[0];
    res.json({ id, nombre_usuario, nombre_completo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.set('port', process.env.PORT || 4000);

swaggerDocs(app);
module.exports = app;