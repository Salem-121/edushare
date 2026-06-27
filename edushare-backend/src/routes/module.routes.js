// ============================================================================
// module.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for modules (/api/modules/...). Reading is open
// to anyone logged in; only admins can create, edit, or delete. Here each route
// lists its own middleware (rather than a shared router.use) so you can see the
// permission per line.
// ============================================================================

const router = require('express').Router()
const { getModules, getModuleById, createModule, updateModule, deleteModule } = require('../controllers/module.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')

// Anyone logged in can read modules
router.get('/', protect, getModules)            // GET /api/modules      -> list modules
router.get('/:id', protect, getModuleById)      // GET /api/modules/123  -> one module

// Only admin can create/edit/delete  (protect THEN requireRole('ADMIN') THEN the handler)
router.post('/', protect, requireRole('ADMIN'), createModule)
router.put('/:id', protect, requireRole('ADMIN'), updateModule)
router.delete('/:id', protect, requireRole('ADMIN'), deleteModule)

module.exports = router
