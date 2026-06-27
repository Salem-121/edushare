// ============================================================================
// user.routes.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the URL map for managing users (/api/users/...). EVERY
// route here is admin-only, which is enforced once at the top with router.use.
// ============================================================================

const router = require('express').Router()
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/user.controller')
const { protect, requireRole } = require('../middleware/auth.middleware')

// These two lines apply to EVERY route below them, in order:
router.use(protect)                 // 1) must be logged in
router.use(requireRole('ADMIN'))    // 2) must be an admin

router.get('/', getUsers)           // GET    /api/users      -> list all users
router.get('/:id', getUserById)     // GET    /api/users/123  -> one user (":id" is a placeholder)
router.post('/', createUser)        // POST   /api/users      -> create a user
router.put('/:id', updateUser)      // PUT    /api/users/123  -> edit a user
router.delete('/:id', deleteUser)   // DELETE /api/users/123  -> delete a user

module.exports = router
