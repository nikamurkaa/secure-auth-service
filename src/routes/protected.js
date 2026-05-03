const express = require('express');
const { authenticate, requireAnyRole, requireRole } = require('../middleware/auth');

function createProtectedRouter(authStore) {
  const router = express.Router();
  const authRequired = authenticate(authStore);

  router.get('/user', authRequired, (req, res) => {
    return res.json({ message: 'Protected user area', role: req.user.role });
  });

  router.get('/moderator', authRequired, requireAnyRole(['moderator', 'admin']), (req, res) => {
    return res.json({ message: 'Moderator area', role: req.user.role });
  });

  router.get('/admin', authRequired, requireRole('admin'), (req, res) => {
    return res.json({ message: 'Admin panel', role: req.user.role });
  });

  return router;
}

module.exports = {
  createProtectedRouter
};
