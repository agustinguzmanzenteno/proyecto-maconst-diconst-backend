const { validationResult } = require('express-validator');
const db = require('../config/db');

function getPaging(req) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, stock_cantidad = 0 } = req.body;

    const [exists] = await db.query('SELECT id FROM producto WHERE nombre = ?', [nombre]);
    if (exists.length) return res.status(409).json({ message: 'Ya existe un producto con ese nombre' });

    const [result] = await db.query(
      'INSERT INTO producto (nombre, stock_cantidad) VALUES (?, ?)',
      [nombre, stock_cantidad]
    );

    const [rows] = await db.query('SELECT id, nombre, stock_cantidad FROM producto WHERE id = ?', [result.insertId]);
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.listProducts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { q } = req.query;
    const { limit, offset, page } = getPaging(req);

    let where = '';
    let params = [];
    if (q) {
      where = 'WHERE nombre LIKE ?';
      params.push(`%${q}%`);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM producto ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT id, nombre, stock_cantidad
       FROM producto
       ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ page, limit, total, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.listAllProducts = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { q } = req.query;

    let where = '';
    const params = [];
    if (q) {
      where = 'WHERE nombre LIKE ?';
      params.push(`%${q}%`);
    }

    const [rows] = await db.query(
      `SELECT id, nombre, stock_cantidad
       FROM producto
       ${where}
       ORDER BY nombre ASC`,
      params
    );

    return res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, nombre, stock_cantidad FROM producto WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Producto no encontrado' });

    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    const { nombre, stock_cantidad } = req.body;

    const fields = [];
    const params = [];
    if (nombre !== undefined) { fields.push('nombre = ?'); params.push(nombre); }
    if (stock_cantidad !== undefined) { fields.push('stock_cantidad = ?'); params.push(stock_cantidad); }
    if (fields.length === 0) return res.status(400).json({ message: 'No hay cambios para actualizar' });

    params.push(id);

    const [result] = await db.query(`UPDATE producto SET ${fields.join(', ')} WHERE id = ?`, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Producto no encontrado' });

    const [rows] = await db.query('SELECT id, nombre, stock_cantidad FROM producto WHERE id = ?', [id]);
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    const [result] = await db.query('DELETE FROM producto WHERE id = ?', [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Producto no encontrado' });

    return res.json({ message: 'Producto eliminado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.stats = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const umbral = Number(req.query.umbral ?? 20);

    const [[row]] = await db.query(
      `
      SELECT
        COUNT(*)                              AS total,
        SUM(CASE WHEN stock_cantidad > 0 THEN 1 ELSE 0 END) AS con_stock,
        SUM(CASE
              WHEN stock_cantidad > 0 AND stock_cantidad < ? THEN 1
              ELSE 0
            END)                              AS low_stock
      FROM producto
      `,
      [umbral]
    );

    res.json({
      total: Number(row.total) || 0,
      con_stock: Number(row.con_stock) || 0,
      low_stock: Number(row.low_stock) || 0,
      umbral,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error obteniendo estadísticas de productos' });
  }
};