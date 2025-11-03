const { validationResult } = require('express-validator');
const db = require('../config/db');

function getPaging(req) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function ensureProductoExists(id_producto) {
  if (id_producto == null) return true;
  const [rows] = await db.query('SELECT id FROM producto WHERE id = ?', [id_producto]);
  return rows.length > 0;
}

exports.createCompra = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mes, anio, id_producto = null, cantidad, precio_unitario } = req.body;

    if (id_producto !== null && !(await ensureProductoExists(id_producto)))
      return res.status(400).json({ message: 'id_producto no existe' });

    const precio_total = Number(cantidad) * Number(precio_unitario);

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO compra (mes, anio, id_producto, cantidad, precio_unitario, precio_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [mes, anio, id_producto, cantidad, precio_unitario, precio_total]
    );

    if (id_producto !== null) {
      await conn.query(
        'UPDATE producto SET stock_cantidad = stock_cantidad + ? WHERE id = ?',
        [cantidad, id_producto]
      );
    }

    await conn.commit();

    const [rows] = await db.query('SELECT * FROM compra WHERE id = ?', [ins.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.createComprasBatch = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const compras = req.body;

    const idsCheck = [...new Set(compras.map(c => c.id_producto).filter(v => v != null))];
    for (const idp of idsCheck) {
      if (!(await ensureProductoExists(idp))) {
        return res.status(400).json({ message: `id_producto ${idp} no existe` });
      }
    }

    await conn.beginTransaction();

    const inserted = [];
    for (const c of compras) {
      const precio_total = Number(c.cantidad) * Number(c.precio_unitario);

      const [ins] = await conn.query(
        `INSERT INTO compra (mes, anio, id_producto, cantidad, precio_unitario, precio_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [c.mes, c.anio, c.id_producto ?? null, c.cantidad, c.precio_unitario, precio_total]
      );
      inserted.push(ins.insertId);

      if (c.id_producto != null) {
        await conn.query(
          'UPDATE producto SET stock_cantidad = stock_cantidad + ? WHERE id = ?',
          [c.cantidad, c.id_producto]
        );
      }
    }

    await conn.commit();

    const [rows] = await db.query(
      `SELECT c.*, p.nombre AS producto_nombre
         FROM compra c LEFT JOIN producto p ON p.id = c.id_producto
        WHERE c.id IN (${inserted.map(() => '?').join(',')})`,
      inserted
    );

    res.status(201).json({ count: inserted.length, data: rows });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.listCompras = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mes, anio, id_producto } = req.query;
    const { page, limit, offset } = getPaging(req);

    const where = [];
    const params = [];

    if (mes) { where.push('mes = ?'); params.push(mes); }
    if (anio) { where.push('anio = ?'); params.push(anio); }
    if (id_producto) { where.push('id_producto = ?'); params.push(id_producto); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM compra ${whereSql}`,
      params
    );

    const [rows] = await db.query(
      `SELECT c.*, p.nombre AS producto_nombre
         FROM compra c
         LEFT JOIN producto p ON p.id = c.id_producto
         ${whereSql}
         ORDER BY c.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ page, limit, total, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.getCompraById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT c.*, p.nombre AS producto_nombre
         FROM compra c
         LEFT JOIN producto p ON p.id = c.id_producto
        WHERE c.id = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: 'Compra no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.updateCompra = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    const { mes, anio, id_producto, cantidad, precio_unitario } = req.body;

    const [currRows] = await db.query('SELECT * FROM compra WHERE id = ?', [id]);
    if (!currRows.length) return res.status(404).json({ message: 'Compra no encontrada' });
    const curr = currRows[0];

    if (id_producto !== undefined && id_producto !== null && !(await ensureProductoExists(id_producto))) {
      return res.status(400).json({ message: 'id_producto no existe' });
    }

    const newCant = cantidad !== undefined ? Number(cantidad) : Number(curr.cantidad);
    const newPU   = precio_unitario !== undefined ? Number(precio_unitario) : Number(curr.precio_unitario);
    const newProd = id_producto !== undefined ? id_producto : curr.id_producto;
    const newTotal = newCant * newPU;

    await conn.beginTransaction();

    if (curr.id_producto != null) {
      await conn.query('UPDATE producto SET stock_cantidad = stock_cantidad - ? WHERE id = ?',
        [curr.cantidad, curr.id_producto]);
    }
    if (newProd != null) {
      await conn.query('UPDATE producto SET stock_cantidad = stock_cantidad + ? WHERE id = ?',
        [newCant, newProd]);
    }

    const fields = [];
    const params = [];
    if (mes !== undefined) { fields.push('mes = ?'); params.push(mes); }
    if (anio !== undefined) { fields.push('anio = ?'); params.push(anio); }
    if (id_producto !== undefined) { fields.push('id_producto = ?'); params.push(newProd); }
    if (cantidad !== undefined) { fields.push('cantidad = ?'); params.push(newCant); }
    if (precio_unitario !== undefined) { fields.push('precio_unitario = ?'); params.push(newPU); }
    fields.push('precio_total = ?'); params.push(newTotal);
    params.push(id);

    await conn.query(`UPDATE compra SET ${fields.join(', ')} WHERE id = ?`, params);
    await conn.commit();

    const [rows] = await db.query('SELECT * FROM compra WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.deleteCompra = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);

    const [currRows] = await db.query('SELECT id_producto, cantidad FROM compra WHERE id = ?', [id]);
    if (!currRows.length) return res.status(404).json({ message: 'Compra no encontrada' });

    const { id_producto, cantidad } = currRows[0];

    await conn.beginTransaction();

    if (id_producto != null) {
      await conn.query(
        'UPDATE producto SET stock_cantidad = stock_cantidad - ? WHERE id = ?',
        [cantidad, id_producto]
      );
    }

    await conn.query('DELETE FROM compra WHERE id = ?', [id]);
    await conn.commit();

    res.json({ message: 'Compra eliminada' });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.getTotales = async (req, res) => {
  try {
    const [totalComprasRows] = await db.query('SELECT COUNT(*) AS total FROM compra');
    const [totalIngresosRows] = await db.query('SELECT SUM(precio_total) AS total FROM compra');

    const totalCompras = totalComprasRows[0].total || 0;
    const totalIngresos = totalIngresosRows[0].total || 0;

    res.json({
      totalCompras,
      totalIngresos: totalIngresos || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};