const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '1d' });

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
}

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre_usuario, contrasenia, nombre_completo } = req.body;

    const [rows] = await db.query('SELECT id FROM usuario WHERE nombre_usuario = ?', [nombre_usuario]);
    if (rows.length > 0) return res.status(409).json({ message: 'El nombre de usuario ya está en uso' });

    const hash = await bcrypt.hash(contrasenia, 10);
    const [result] = await db.query(
      'INSERT INTO usuario (nombre_usuario, contrasenia, nombre_completo) VALUES (?,?,?)',
      [nombre_usuario, hash, nombre_completo]
    );

    const user = { id: result.insertId, nombre_usuario, nombre_completo };
    const token = signToken({ id: user.id, nombre_usuario });
    setAuthCookie(res, token);

    return res.status(201).json({ user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre_usuario, contrasenia } = req.body;
    const [rows] = await db.query(
      'SELECT id, nombre_usuario, contrasenia, nombre_completo FROM usuario WHERE nombre_usuario = ?',
      [nombre_usuario]
    );
    if (rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

    const usuario = rows[0];
    const ok = await bcrypt.compare(contrasenia, usuario.contrasenia);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = signToken({ id: usuario.id, nombre_usuario: usuario.nombre_usuario });
    setAuthCookie(res, token);

    delete usuario.contrasenia;
    return res.json({ user: usuario });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

exports.logout = async (_req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  return res.status(200).json({ message: 'Sesión cerrada' });
};