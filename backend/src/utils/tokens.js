const jwt = require('jsonwebtoken');

const secret = () => process.env.JWT_SECRET;

// `tv` = users.token_version. Bumping it (logout, password reset, delete) kills every token issued before.
const signSession = (user, roleName) => jwt.sign(
  { id: user.id, email: user.email, role: roleName, tv: user.token_version },
  secret(),
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

const signVerify = (user) => jwt.sign({ id: user.id, purpose: 'verify' }, secret(), { expiresIn: '24h' });

const signReset = (user) => jwt.sign({ id: user.id, purpose: 'reset', tv: user.token_version }, secret(), { expiresIn: '30m' });

// Returns the payload, or null if invalid, expired or minted for another purpose.
const readPurposeToken = (token, purpose) => {
  try {
    const payload = jwt.verify(String(token || ''), secret());
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
};

module.exports = { signSession, signVerify, signReset, readPurposeToken };
