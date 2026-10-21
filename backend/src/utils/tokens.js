const jwt = require('jsonwebtoken');

// server.js refuses to start without JWT_SECRET, so there is deliberately no fallback here:
// a default secret in a public repo would let anyone forge a login token.
const secret = () => process.env.JWT_SECRET;

// `tv` = users.token_version. Bumping it (logout, account deletion) kills every token issued before.
const signSession = (user, roleName) => jwt.sign(
  { id: user.id, email: user.email, role: roleName, tv: user.token_version },
  secret(),
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

module.exports = { signSession };
