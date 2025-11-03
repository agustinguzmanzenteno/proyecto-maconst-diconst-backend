const express = require('express');
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/compraController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Compras
 *   description: Registro de compras e impacto en stock
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     MesQuery:
 *       in: query
 *       name: mes
 *       schema: { type: string, example: "ENERO" }
 *       description: Mes de la compra (texto o código que uses). Se filtra por igualdad.
 *     AnioQuery:
 *       in: query
 *       name: anio
 *       schema: { type: integer, minimum: 1900, example: 2025 }
 *       description: Año de la compra. Se filtra por igualdad.
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
 *     CompraIdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: ID de la compra
 */

/**
 * @swagger
 * /api/compras:
 *   post:
 *     summary: Crear una compra
 *     description: Inserta una compra y **aumenta** el stock del producto (si `id_producto` no es nulo).
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompraCreate' }
 *     responses:
 *       201:
 *         description: Compra creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       400:
 *         description: Datos inválidos o id_producto inexistente
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
 * /api/compras/batch:
 *   post:
 *     summary: Crear varias compras (batch)
 *     description: Inserta múltiples compras en una transacción y **aumenta** el stock por cada item con `id_producto` no nulo.
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompraBatchRequest' }
 *     responses:
 *       201:
 *         description: Compras creadas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CompraBatchResponse' }
 *       400:
 *         description: Datos inválidos o algún id_producto inexistente
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
 * /api/compras:
 *   get:
 *     summary: Listar compras (filtros + paginación)
 *     tags: [Compras]
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
 *         description: Lista paginada de compras (incluye `producto_nombre` si aplica)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CompraListResponse' }
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
 * /api/compras/totales:
 *   get:
 *     summary: Totales de compras
 *     description: Devuelve el total de registros y la suma de `precio_total` en compras.
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Totales de compras
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CompraTotalsResponse' }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/compras/{id}:
 *   get:
 *     summary: Obtener compra por ID
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompraIdParam'
 *     responses:
 *       200:
 *         description: Compra encontrada (incluye `producto_nombre` si aplica)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Compra no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/compras/{id}:
 *   put:
 *     summary: Actualizar compra
 *     description: Actualiza la compra y **recalcula stock** revirtiendo el anterior y aplicando el nuevo.
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompraIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CompraUpdate' }
 *     responses:
 *       200:
 *         description: Compra actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Compra' }
 *       400:
 *         description: Datos inválidos o id_producto inexistente
 *         content:
 *           application/json:
 *             schema: { oneOf: [ { $ref: '#/components/schemas/ValidationError' }, { $ref: '#/components/schemas/ApiMessage' } ] }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Compra no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/compras/{id}:
 *   delete:
 *     summary: Eliminar compra
 *     description: Elimina la compra y **revierte** el stock sumado previamente.
 *     tags: [Compras]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CompraIdParam'
 *     responses:
 *       200:
 *         description: Compra eliminada
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
 *         description: Compra no encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

router.post(
  '/',
  [
    body('mes').trim().notEmpty(),
    body('anio').isInt({ min: 1900 }),
    body('id_producto').optional({ nullable: true }).isInt({ min: 1 }),
    body('cantidad').isInt({ min: 1 }),
    body('precio_unitario').isFloat({ gt: 0 }),
  ],
  ctrl.createCompra
);

router.post(
  '/batch',
  [
    body().isArray({ min: 1 }),
    body('*.mes').trim().notEmpty(),
    body('*.anio').isInt({ min: 1900 }),
    body('*.id_producto').optional({ nullable: true }).isInt({ min: 1 }),
    body('*.cantidad').isInt({ min: 1 }),
    body('*.precio_unitario').isFloat({ gt: 0 }),
  ],
  ctrl.createComprasBatch
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
  ctrl.listCompras
);

router.get('/totales', ctrl.getTotales);

router.get('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.getCompraById);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('mes').optional().trim().notEmpty(),
    body('anio').optional().isInt({ min: 1900 }),
    body('id_producto').optional({ nullable: true }).isInt({ min: 1 }),
    body('cantidad').optional().isInt({ min: 1 }),
    body('precio_unitario').optional().isFloat({ gt: 0 }),
  ],
  ctrl.updateCompra
);

router.delete('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.deleteCompra);

module.exports = router;