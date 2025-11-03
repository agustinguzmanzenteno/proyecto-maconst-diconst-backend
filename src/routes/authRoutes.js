const express = require('express');
const { body } = require('express-validator');
const { register, login, logout } = require('../controllers/authController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación de usuarios
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registro de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiMessage'
 *       400:
 *         description: Datos inválidos
 */
 
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login (setea cookie httpOnly con el JWT)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Autenticado (cookie seteada)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiMessage'
 *       401:
 *         description: Credenciales inválidas
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Perfil básico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (elimina cookie)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiMessage'
 *       401:
 *         description: No autenticado
 */

router.post('/register', [
  body('nombre_usuario').trim().notEmpty(),
  body('contrasenia').isLength({ min: 6 }),
  body('nombre_completo').trim().notEmpty(),
], register);

router.post('/login', [
  body('nombre_usuario').trim().notEmpty(),
  body('contrasenia').notEmpty(),
], login);

router.post('/logout', requireAuth, logout);

module.exports = router;