const express = require('express');
const { query } = require('express-validator');
const { getMensual, getTotales, getTotalProductos, getTopProductos } = require('../controllers/reporteController');
const { validationResult } = require('express-validator');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reportes
 *   description: Generación de reportes y análisis de datos
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     AnioQuery:
 *       in: query
 *       name: anio
 *       schema: { type: integer, minimum: 1900, example: 2025 }
 *       description: Año del reporte. Se filtra por igualdad.
 *     DesdeQuery:
 *       in: query
 *       name: desde
 *       schema: { type: integer, minimum: 1900, example: 2020 }
 *       description: Año de inicio para el cálculo de totales.
 *     HastaQuery:
 *       in: query
 *       name: hasta
 *       schema: { type: integer, minimum: 1900, example: 2025 }
 *       description: Año de fin para el cálculo de totales.
 */

/**
 * @swagger
 * /api/reportes/mensual:
 *   get:
 *     summary: Reporte mensual de compras y ventas
 *     description: Devuelve las compras y ventas por mes para un año específico.
 *     tags: [Reportes]
 *     parameters:
 *       - $ref: '#/components/parameters/AnioQuery'
 *     responses:
 *       200:
 *         description: Reporte mensual de compras y ventas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReporteMensualResponse' }
 *       400:
 *         description: Año inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/reportes/totales:
 *   get:
 *     summary: Reporte de totales de compras y ventas entre años
 *     description: Devuelve los totales de compras y ventas entre un rango de años.
 *     tags: [Reportes]
 *     parameters:
 *       - $ref: '#/components/parameters/DesdeQuery'
 *       - $ref: '#/components/parameters/HastaQuery'
 *     responses:
 *       200:
 *         description: Totales de compras y ventas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReporteTotalesResponse' }
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/reportes/total-productos:
 *   get:
 *     summary: Total de productos
 *     description: Devuelve el total de productos registrados.
 *     tags: [Reportes]
 *     responses:
 *       200:
 *         description: Total de productos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TotalProductosResponse' }
 *       500:
 *         description: Error en el servidor
 */

/**
 * @swagger
 * /api/reportes/top-productos:
 *   get:
 *     summary: Reporte de los 5 productos más vendidos
 *     description: Devuelve los 5 productos con mayores ventas, ordenados por total en bolivianos.
 *     tags: [Reportes]
 *     parameters:
 *       - $ref: '#/components/parameters/AnioQuery'
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Top 5 productos más vendidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TopProductosResponse' }
 *       400:
 *         description: Año inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiMessage' }
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error en el servidor
 */

router.get(
  '/mensual',
  [ query('anio').isInt({ min: 1900 }) ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  getMensual
);

router.get(
  '/totales',
  [
    query('desde').optional().isInt({ min: 1900 }),
    query('hasta').optional().isInt({ min: 1900 }),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  getTotales
);

router.get('/total-productos', getTotalProductos);

router.get(
  '/top-productos',
  requireAuth,
  [ query('anio').optional().isInt({ min: 1900 }) ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  getTopProductos
);

module.exports = router;