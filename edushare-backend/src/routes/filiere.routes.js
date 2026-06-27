// ============================================================================
// filiere.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for filières / study tracks (/api/filieres/...).
// The list is PUBLIC (no login) because the registration page needs it so new
// students can pick their filière. Everything else is admin-only.
// ============================================================================

const router = require('express').Router()
const { getFilieres, getFiliereById, createFiliere, updateFiliere, deleteFiliere } = require('../controllers/filiere.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')

// Public list — needed by the register page so users can choose a filiere
router.get('/', getFilieres)                    // GET /api/filieres      -> list (no login needed)
router.get('/:id', protect, getFiliereById)     // GET /api/filieres/123  -> one (login needed)

// Admin-only writes:
router.post('/', protect, requireRole('ADMIN'), createFiliere)
router.put('/:id', protect, requireRole('ADMIN'), updateFiliere)
router.delete('/:id', protect, requireRole('ADMIN'), deleteFiliere)

module.exports = router
