const { validationResult } = require('express-validator');
const db = require('../config/db');

function getPaging(req) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function productoExiste(id) {
  const [r] = await db.query('SELECT id FROM producto WHERE id = ?', [id]);
  return r.length > 0;
}

function buildCodigo(n) {
  return `A${String(n).padStart(3, '0')}`;
}

async function nextCodigoForMonth(conn, mes, anio) {
  const [r] = await conn.query(
    'SELECT codigo FROM venta WHERE mes = ? AND anio = ? ORDER BY id DESC LIMIT 1',
    [mes, anio]
  );
  if (!r.length) return buildCodigo(1);
  const last = r[0].codigo;
  const num = parseInt(last.slice(1), 10) || 0;
  return buildCodigo(num + 1);
}

async function nextCodigoForMonthBase(conn, mes, anio) {
  const [r] = await conn.query(
    'SELECT codigo FROM venta WHERE mes = ? AND anio = ? ORDER BY id DESC LIMIT 1',
    [mes, anio]
  );
  if (!r.length) return 0;
  const last = r[0].codigo;
  const num = parseInt(last.slice(1), 10) || 0;
  return num;
}

exports.createVenta = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mes, anio, id_producto, cantidad, precio_unitario } = req.body;
    if (!(await productoExiste(id_producto))) {
      return res.status(400).json({ message: 'id_producto no existe' });
    }

    const cant = Number(cantidad);
    const pu = Number(precio_unitario);
    const precio_total = cant * pu;

    await conn.beginTransaction();

    const [prow] = await conn.query(
      'SELECT stock_cantidad FROM producto WHERE id = ? FOR UPDATE',
      [id_producto]
    );
    if (!prow.length) throw new Error('Producto no encontrado durante la venta');

    const stock = Number(prow[0].stock_cantidad);
    if (stock <= 0 || stock < cant) {
      await conn.rollback();
      return res.status(400).json({ message: 'Stock insuficiente para realizar la venta' });
    }

    const codigo = await nextCodigoForMonth(conn, mes, anio);

    const [ins] = await conn.query(
      `INSERT INTO venta (codigo, mes, anio, id_producto, cantidad, precio_unitario, precio_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [codigo, mes, anio, id_producto, cant, pu, precio_total]
    );

    await conn.query(
      'UPDATE producto SET stock_cantidad = stock_cantidad - ? WHERE id = ?',
      [cant, id_producto]
    );

    await conn.commit();

    const [rows] = await db.query(
      `SELECT v.*, p.nombre AS producto_nombre
         FROM venta v LEFT JOIN producto p ON p.id = v.id_producto
        WHERE v.id = ?`,
      [ins.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.createVentasBatch = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ventas = req.body;
    if (!Array.isArray(ventas) || ventas.length === 0) {
      return res.status(400).json({ message: 'El cuerpo debe ser un arreglo con al menos una venta' });
    }

    const idsProd = [...new Set(ventas.map(v => Number(v.id_producto)))];
    for (const idp of idsProd) {
      if (!(await productoExiste(idp))) {
        return res.status(400).json({ message: `id_producto ${idp} no existe` });
      }
    }

    const requeridoPorProducto = new Map();
    for (const v of ventas) {
      const prev = requeridoPorProducto.get(v.id_producto) || 0;
      requeridoPorProducto.set(v.id_producto, prev + Number(v.cantidad));
    }

    await conn.beginTransaction();

    for (const [idp, reqCant] of requeridoPorProducto.entries()) {
      const [prow] = await conn.query(
        'SELECT stock_cantidad FROM producto WHERE id = ? FOR UPDATE',
        [idp]
      );
      if (!prow.length) {
        await conn.rollback();
        return res.status(400).json({ message: `Producto ${idp} no encontrado` });
      }
      const stock = Number(prow[0].stock_cantidad);
      if (stock <= 0 || stock < reqCant) {
        await conn.rollback();
        return res.status(400).json({
          message: `Stock insuficiente para producto ${idp}. Stock=${stock}, requerido=${reqCant}`
        });
      }
    }

    const paresMesAnio = [...new Set(ventas.map(v => `${v.mes}:::${v.anio}`))];
    const basePorMes = new Map();
    for (const key of paresMesAnio) {
      const [mes, anioStr] = key.split(':::');
      const anio = Number(anioStr);
      const base = await nextCodigoForMonthBase(conn, mes, anio);
      basePorMes.set(key, base);
    }

    const insertedIds = [];
    for (const v of ventas) {
      const key = `${v.mes}:::${v.anio}`;
      const nextNum = (basePorMes.get(key) || 0) + 1;
      basePorMes.set(key, nextNum);
      const codigo = buildCodigo(nextNum);

      const cant = Number(v.cantidad);
      const pu = Number(v.precio_unitario);
      const precio_total = cant * pu;

      const [ins] = await conn.query(
        `INSERT INTO venta (codigo, mes, anio, id_producto, cantidad, precio_unitario, precio_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [codigo, v.mes, v.anio, v.id_producto, cant, pu, precio_total]
      );
      insertedIds.push(ins.insertId);
    }

    for (const [idp, reqCant] of requeridoPorProducto.entries()) {
      await conn.query(
        'UPDATE producto SET stock_cantidad = stock_cantidad - ? WHERE id = ?',
        [reqCant, idp]
      );
    }

    await conn.commit();

    const [rows] = await db.query(
      `SELECT v.*, p.nombre AS producto_nombre
         FROM venta v LEFT JOIN producto p ON p.id = v.id_producto
        WHERE v.id IN (${insertedIds.map(() => '?').join(',')})`,
      insertedIds
    );

    return res.status(201).json({ count: insertedIds.length, data: rows });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    return res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.listVentas = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mes, anio, id_producto } = req.query;
    const { page, limit, offset } = getPaging(req);

    const where = [];
    const params = [];
    if (mes) { where.push('v.mes = ?'); params.push(mes); }
    if (anio) { where.push('v.anio = ?'); params.push(anio); }
    if (id_producto) { where.push('v.id_producto = ?'); params.push(id_producto); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM venta v ${whereSql}`, params
    );

    const [rows] = await db.query(
      `SELECT v.*, p.nombre AS producto_nombre
         FROM venta v
         LEFT JOIN producto p ON p.id = v.id_producto
         ${whereSql}
         ORDER BY v.id DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ page, limit, total, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.getVentaById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = Number(req.params.id);
    const [rows] = await db.query(
      `SELECT v.*, p.nombre AS producto_nombre
         FROM venta v LEFT JOIN producto p ON p.id = v.id_producto
        WHERE v.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Venta no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.updateVenta = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = Number(req.params.id);
    const { mes, anio, id_producto, cantidad, precio_unitario } = req.body;

    const [currRows] = await db.query('SELECT * FROM venta WHERE id = ?', [id]);
    if (!currRows.length) return res.status(404).json({ message: 'Venta no encontrada' });
    const curr = currRows[0];

    const newProd = id_producto !== undefined ? id_producto : curr.id_producto;
    const newCant = cantidad !== undefined ? Number(cantidad) : Number(curr.cantidad);
    const newPU   = precio_unitario !== undefined ? Number(precio_unitario) : Number(curr.precio_unitario);
    const newTotal = newCant * newPU;

    if (!(await productoExiste(newProd))) {
      return res.status(400).json({ message: 'id_producto no existe' });
    }

    await conn.beginTransaction();

    const [prevP] = await conn.query(
      'SELECT stock_cantidad FROM producto WHERE id = ? FOR UPDATE',
      [curr.id_producto]
    );
    if (!prevP.length) throw new Error('Producto anterior no encontrado');
    await conn.query(
      'UPDATE producto SET stock_cantidad = stock_cantidad + ? WHERE id = ?',
      [curr.cantidad, curr.id_producto]
    );

    const [newP] = await conn.query(
      'SELECT stock_cantidad FROM producto WHERE id = ? FOR UPDATE',
      [newProd]
    );
    if (!newP.length) throw new Error('Producto nuevo no encontrado');
    const stockNuevo = Number(newP[0].stock_cantidad);
    if (stockNuevo <= 0 || stockNuevo < newCant) {
      await conn.rollback();
      return res.status(400).json({ message: 'Stock insuficiente con los nuevos datos' });
    }
    await conn.query(
      'UPDATE producto SET stock_cantidad = stock_cantidad - ? WHERE id = ?',
      [newCant, newProd]
    );

    const fields = [];
    const params = [];
    if (mes !== undefined) { fields.push('mes = ?'); params.push(mes); }
    if (anio !== undefined) { fields.push('anio = ?'); params.push(anio); }
    if (id_producto !== undefined) { fields.push('id_producto = ?'); params.push(newProd); }
    if (cantidad !== undefined) { fields.push('cantidad = ?'); params.push(newCant); }
    if (precio_unitario !== undefined) { fields.push('precio_unitario = ?'); params.push(newPU); }
    fields.push('precio_total = ?'); params.push(newTotal);
    params.push(id);

    await conn.query(`UPDATE venta SET ${fields.join(', ')} WHERE id = ?`, params);
    await conn.commit();

    const [rows] = await db.query('SELECT * FROM venta WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    conn.release();
  }
};

exports.deleteVenta = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = Number(req.params.id);

    const [currRows] = await db.query('SELECT id_producto, cantidad FROM venta WHERE id = ?', [id]);
    if (!currRows.length) return res.status(404).json({ message: 'Venta no encontrada' });

    const { id_producto, cantidad } = currRows[0];

    await conn.beginTransaction();

    await conn.query(
      'UPDATE producto SET stock_cantidad = stock_cantidad + ? WHERE id = ?',
      [cantidad, id_producto]
    );

    await conn.query('DELETE FROM venta WHERE id = ?', [id]);

    await conn.commit();
    res.json({ message: 'Venta eliminada' });
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
    const [totalVentasRows] = await db.query('SELECT COUNT(*) AS total FROM venta');
    const [totalIngresosRows] = await db.query('SELECT SUM(precio_total) AS total FROM venta');

    const totalVentas = totalVentasRows[0].total || 0;
    const totalIngresos = totalIngresosRows[0].total || 0;

    res.json({
      totalVentas,
      totalIngresos: totalIngresos || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};