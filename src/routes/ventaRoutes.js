const express = require('express');
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/ventaController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Ventas
 *   description: Registro de ventas y gestión de stock
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     MesQuery:
 *       in: query
 *       name: mes
 *       schema: { type: string, example: "ENERO" }
 *       description: Mes de la venta (texto o código que uses). Se filtra por igualdad.
 *     AnioQuery:
 *       in: query
 *       name: anio
 *       schema: { type: integer, minimum: 1900, example: 2025 }
 *       description: Año de la venta. Se filtra por igualdad.
 *     IdProductoQuery:
 *       in: query
 *       name: id_producto
 *       schema: { type: integer, minimum: 1, example: 101 }
 *       description: ID del producto asociado (opcional). Se filtra por igualdad.
 *     PageParam:
 *       in: query
 *       name: page
 *       schema: { type: integer, minimum: 1, default: 1 }
 *       description: Número de página
 *     LimitParam:
 *       in: query
 *       name: limit
 *       schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       description: Tamaño de página
 *     VentaIdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: ID de la venta
 */

/**
 * @swagger
 * /api/ventas:
 *   post:
 *     summary: Crear una venta
 *     description: Inserta una venta y **descuenta** el stock del producto.
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VentaCreate' }
 *     responses:
 *       201:
 *         description: Venta creada y stock actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Venta' }
 *       400:
 *         description: Datos inválidos o producto con stock insuficiente
 *         content:
 *           application/json:
 *             schema: { oneOf: [ { $ref: '#/components/schemas/ValidationError' }, { $ref: '#/components/schemas/ApiMessage' } ] }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas/batch:
 *   post:
 *     summary: Crear varias ventas (batch)
 *     description: Inserta múltiples ventas en una transacción y **descuenta** el stock por cada producto.
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VentaBatchRequest' }
 *     responses:
 *       201:
 *         description: Ventas creadas y stock actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/VentaBatchResponse' }
 *       400:
 *         description: Datos inválidos o producto con stock insuficiente
 *         content:
 *           application/json:
 *             schema: { oneOf: [ { $ref: '#/components/schemas/ValidationError' }, { $ref: '#/components/schemas/ApiMessage' } ] }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas:
 *   get:
 *     summary: Listar ventas (filtros + paginación)
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MesQuery'
 *       - $ref: '#/components/parameters/AnioQuery'
 *       - $ref: '#/components/parameters/IdProductoQuery'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Lista paginada de ventas (incluye `producto_nombre` si aplica)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/VentaListResponse' }
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas/totales:
 *   get:
 *     summary: Totales de ventas
 *     description: Devuelve el total de registros y la suma de `precio_total` en ventas.
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Totales de ventas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/VentaTotalsResponse' }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas/{id}:
 *   get:
 *     summary: Obtener venta por ID
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/VentaIdParam'
 *     responses:
 *       200:
 *         description: Venta encontrada (incluye `producto_nombre` si aplica)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Venta' }
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Venta no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas/{id}:
 *   put:
 *     summary: Actualizar venta
 *     description: Actualiza una venta y **recalcula el stock** del producto.
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/VentaIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VentaUpdate' }
 *     responses:
 *       200:
 *         description: Venta actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Venta' }
 *       400:
 *         description: Datos inválidos o producto con stock insuficiente
 *         content:
 *           application/json:
 *             schema: { oneOf: [ { $ref: '#/components/schemas/ValidationError' }, { $ref: '#/components/schemas/ApiMessage' } ] }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Venta no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/ventas/{id}:
 *   delete:
 *     summary: Eliminar venta
 *     description: Elimina una venta y **restaura el stock** de los productos.
 *     tags: [Ventas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/VentaIdParam'
 *     responses:
 *       200:
 *         description: Venta eliminada y stock restaurado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Venta no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

router.post(
  '/batch',
  [
    body().isArray({ min: 1 }),
    body('*.mes').trim().notEmpty(),
    body('*.anio').isInt({ min: 1900 }),
    body('*.id_producto').isInt({ min: 1 }),
    body('*.cantidad').isInt({ min: 1 }),
    body('*.precio_unitario').isFloat({ gt: 0 }),
  ],
  ctrl.createVentasBatch
);

router.post(
  '/',
  [
    body('mes').trim().notEmpty(),
    body('anio').isInt({ min: 1900 }),
    body('id_producto').isInt({ min: 1 }),
    body('cantidad').isInt({ min: 1 }),
    body('precio_unitario').isFloat({ gt: 0 }),
  ],
  ctrl.createVenta
);

router.get(
  '/',
  [
    query('mes').optional().isString(),
    query('anio').optional().isInt({ min: 1900 }),
    query('id_producto').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  ctrl.listVentas
);

router.get('/totales', ctrl.getTotales);

router.get('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.getVentaById);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('mes').optional().trim().notEmpty(),
    body('anio').optional().isInt({ min: 1900 }),
    body('id_producto').optional().isInt({ min: 1 }),
    body('cantidad').optional().isInt({ min: 1 }),
    body('precio_unitario').optional().isFloat({ gt: 0 }),
  ],
  ctrl.updateVenta
);

router.delete('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.deleteVenta);

module.exports = router;