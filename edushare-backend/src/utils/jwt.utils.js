// ============================================================================
// jwt.utils.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: helpers for JWTs (JSON Web Tokens), the signed tokens that
// prove who a user is. When someone logs in we "sign" a token; on later requests
// we "verify" it. The token is signed with a secret key (JWT_SECRET) that only
// the server knows — so nobody can forge a fake token.
//
// This file ALSO refuses to start the server if the secret is missing or weak,
// because a guessable secret would let anyone impersonate any user.
// ============================================================================

const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || ''   // the signing key, read from .env

// Fail fast: a missing or trivially-short secret means anyone reading the
// codebase can forge tokens for any user. 32 chars is the bare minimum;
// 64+ random bytes (hex) is what we recommend in .env.example.
if (!SECRET || SECRET.length < 32) {
  console.error('\n❌ JWT_SECRET is missing or too short (< 32 chars).')
  console.error('   Generate one with:')
  console.error('     node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
  console.error('   and put it in .env.\n')
  process.exit(1)   // stop the whole server
}

// Also reject well-known placeholder secrets that may have leaked into git.
const KNOWN_BAD = new Set([
  'your_secret_here',
  'change_in_production',
  'edushare_super_secret_jwt_key_change_in_production_2025',
])
if (KNOWN_BAD.has(SECRET)) {
  console.error('\n❌ JWT_SECRET is a placeholder value. Rotate it before starting the server.\n')
  process.exit(1)
}

// signToken: create a token that encodes a user id and expires in 7 days.
const signToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '7d' })
// verifyToken: check a token is valid + unexpired, and return its contents.
// (Throws an error if the token is fake or expired.)
const verifyToken = (token) => jwt.verify(token, SECRET)

module.exports = { signToken, verifyToken }
