const db = require('../config/db');

const MESES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];

exports.getMensual = async (req, res) => {
  try {
    const anio = parseInt(req.query.anio, 10);
    if (!anio || anio < 1900) {
      return res.status(400).json({ message: 'anio requerido' });
    }

    const compras = Array(12).fill(0);
    const ventas  = Array(12).fill(0);

    const fieldOrder = `FIELD(mes, '${MESES.join("','")}')`;

    const [rowsC] = await db.query(
      `SELECT mes, SUM(precio_total) AS total
         FROM compra
        WHERE anio = ?
        GROUP BY mes
        ORDER BY ${fieldOrder}`,
      [anio]
    );
    for (const r of rowsC) {
      const idx = MESES.indexOf(String(r.mes).toUpperCase());
      if (idx >= 0) compras[idx] = Number(r.total) || 0;
    }

    const [rowsV] = await db.query(
      `SELECT mes, SUM(precio_total) AS total
         FROM venta
        WHERE anio = ?
        GROUP BY mes
        ORDER BY ${fieldOrder}`,
      [anio]
    );
    for (const r of rowsV) {
      const idx = MESES.indexOf(String(r.mes).toUpperCase());
      if (idx >= 0) ventas[idx] = Number(r.total) || 0;
    }

    const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    res.json({ anio, labels, compras, ventas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error generando reporte mensual' });
  }
};

exports.getTotales = async (req, res) => {
  try {
    const desde = parseInt(req.query.desde || '1992', 10);
    const hasta = parseInt(req.query.hasta || String(new Date().getFullYear()), 10);

    if (!desde || !hasta || desde > hasta) {
      return res.status(400).json({ message: 'Parámetros inválidos: desde / hasta' });
    }

    const where = 'WHERE anio BETWEEN ? AND ?';
    const params = [desde, hasta];

    const [[c]] = await db.query(
      `SELECT COALESCE(SUM(precio_total), 0) AS total_compras FROM compra ${where}`,
      params
    );
    const [[v]] = await db.query(
      `SELECT COALESCE(SUM(precio_total), 0) AS total_ventas FROM venta ${where}`,
      params
    );

    res.json({
      desde, hasta,
      total_compras: Number(c.total_compras || 0),
      total_ventas:  Number(v.total_ventas  || 0),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error obteniendo totales globales' });
  }
};

exports.getTotalProductos = async (req, res) => {
  try {
    const [[row]] = await db.query('SELECT COUNT(*) AS total FROM producto');
    res.json({ total_productos: Number(row.total) || 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error obteniendo total de productos' });
  }
};

exports.getTopProductos = async (req, res) => {
  try {
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : null;

    const where = anio ? 'WHERE v.anio = ?' : '';
    const params = anio ? [anio] : [];

    const [rows] = await db.query(
      `
      SELECT p.id,
             p.nombre,
             COALESCE(SUM(v.cantidad), 0)       AS unidades,
             COALESCE(SUM(v.precio_total), 0.0) AS total_bs
      FROM venta v
      JOIN producto p ON p.id = v.id_producto
      ${where}
      GROUP BY p.id, p.nombre
      ORDER BY total_bs DESC
      LIMIT 5
      `,
      params
    );

    res.json(rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      unidades: Number(r.unidades) || 0,
      total_bs: Number(r.total_bs) || 0,
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error obteniendo Top productos' });
  }
};