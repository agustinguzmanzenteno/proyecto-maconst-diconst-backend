const express = require('express');
const { body, param, query } = require('express-validator');
const ctrl = require('../controllers/productController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Productos
 *   description: Gestión de productos
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     QParam:
 *       in: query
 *       name: q
 *       schema: { type: string }
 *       description: Búsqueda por nombre (LIKE %q%)
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
 *     UmbralParam:
 *       in: query
 *       name: umbral
 *       schema: { type: integer, minimum: 0, default: 20 }
 *       description: Límite inferior para considerar stock bajo
 *     IdParam:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: integer, minimum: 1 }
 *       description: ID del producto
 */

/**
 * @swagger
 * /api/productos:
 *   get:
 *     summary: Listar productos (paginado + búsqueda)
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/QParam'
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Lista paginada de productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductoListResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 */

/**
 * @swagger
 * /api/productos/all:
 *   get:
 *     summary: Listar todos los productos (sin paginación, ordenados por nombre)
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/QParam'
 *     responses:
 *       200:
 *         description: Lista completa de productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductoAllResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 */

/**
 * @swagger
 * /api/productos/stats:
 *   get:
 *     summary: Estadísticas de productos (conteos y low stock)
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UmbralParam'
 *     responses:
 *       200:
 *         description: Resumen de inventario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductoStatsResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 */

/**
 * @swagger
 * /api/productos/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Producto'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 */

/**
 * @swagger
 * /api/productos:
 *   post:
 *     summary: Crear producto
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductoCreate' }
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Producto' }
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 *       401:
 *         description: No autenticado
 *       409:
 *         description: Conflicto (nombre duplicado)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 */

/**
 * @swagger
 * /api/productos/{id}:
 *   put:
 *     summary: Actualizar producto
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ProductoUpdate' }
 *     responses:
 *       200:
 *         description: Producto actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Producto' }
 *       400:
 *         description: Datos inválidos o sin cambios
 *         content:
 *           application/json:
 *             schema: { oneOf: [ { $ref: '#/components/schemas/ValidationError' }, { $ref: '#/components/schemas/ApiMessage' } ] }
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 */

/**
 * @swagger
 * /api/productos/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     tags: [Productos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Producto eliminado
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
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 */

router.post(
  '/',
  [ body('nombre').trim().notEmpty(), body('stock_cantidad').optional().isInt({ min: 0 }) ],
  ctrl.createProduct
);

router.get(
  '/',
  [ query('q').optional().isString(), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }) ],
  ctrl.listProducts
);

router.get(
  '/all',
  [ query('q').optional().isString() ],
  ctrl.listAllProducts
);

router.get(
  '/stats',
  [ query('umbral').optional().isInt({ min: 0 }) ],
  ctrl.stats
);

router.get('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.getProductById);

router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('nombre').optional().trim().notEmpty(),
    body('stock_cantidad').optional().isInt({ min: 0 }),
  ],
  ctrl.updateProduct
);

router.delete('/:id', [ param('id').isInt({ min: 1 }) ], ctrl.deleteProduct);

module.exports = router;