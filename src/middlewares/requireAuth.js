const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const tokenCookie = req.cookies?.token;

    const header = req.headers.authorization || '';
    const bearerToken = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

    const token = tokenCookie || bearerToken;
    if (!token) return res.status(401).json({ message: 'Token no provisto' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};