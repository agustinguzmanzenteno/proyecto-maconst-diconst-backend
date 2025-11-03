const { Router } = require('express');
const C = require('../controllers/predecirController');

const r = Router();

/**
 * @swagger
 * tags:
 *   name: Predicciones
 *   description: Generación y gestión de predicciones de ventas utilizando el modelo de Prophet.
 */

/**
 * @swagger
 * /api/predecir:
 *   post:
 *     summary: Crear una predicción
 *     description: Crea una nueva predicción utilizando un modelo pre-entrenado.
 *     tags: [Predicciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PronosticoCreate' }
 *     responses:
 *       201:
 *         description: Predicción creada con éxito.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pronostico' }
 *       400:
 *         description: Parámetros inválidos para generar la predicción.
 *       500:
 *         description: Error al generar la predicción.
 */
r.post('/', C.crearPronostico);

/**
 * @swagger
 * /api/predecir:
 *   get:
 *     summary: Listar predicciones
 *     description: Obtiene las predicciones generadas en un rango de fechas.
 *     tags: [Predicciones]
 *     parameters:
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtrar pronósticos.
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtrar pronósticos.
 *     responses:
 *       200:
 *         description: Lista de predicciones.
 *         content:
 *           application/json:
 *             schema: 
 *               type: array
 *               items: { $ref: '#/components/schemas/Pronostico' }
 *       500:
 *         description: Error al obtener las predicciones.
 */
r.get('/', C.listarPronosticos);

/**
 * @swagger
 * /api/predecir/{id}:
 *   get:
 *     summary: Obtener una predicción por ID
 *     description: Obtiene una predicción específica por su ID.
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la predicción.
 *     responses:
 *       200:
 *         description: Predicción encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pronostico' }
 *       404:
 *         description: Predicción no encontrada.
 *       500:
 *         description: Error al obtener la predicción.
 */
r.get('/:id', C.obtenerPronostico);

/**
 * @swagger
 * /api/predecir/{id}:
 *   put:
 *     summary: Actualizar una predicción
 *     description: Actualiza los parámetros de una predicción existente, o lo regenera si es necesario.
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la predicción a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PronosticoUpdate' }
 *     responses:
 *       200:
 *         description: Predicción actualizada con éxito.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Pronostico' }
 *       400:
 *         description: Parámetros inválidos para regenerar la predicción.
 *       404:
 *         description: Predicción no encontrada.
 *       500:
 *         description: Error al actualizar la predicción.
 */
r.put('/:id', C.actualizarPronostico);

/**
 * @swagger
 * /api/predecir/{id}:
 *   delete:
 *     summary: Eliminar una predicción
 *     description: Elimina una predicción existente.
 *     tags: [Predicciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la predicción a eliminar.
 *     responses:
 *       200:
 *         description: Predicción eliminada con éxito.
 *       404:
 *         description: Predicción no encontrada.
 *       500:
 *         description: Error al eliminar la predicción.
 */
r.delete('/:id', C.eliminarPronostico);

module.exports = r;