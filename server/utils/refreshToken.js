const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const ACCESS_TOKEN_EXPIRY = '15m';

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      mobile: user.mobile,
      username: user.username,
      templeId: user.temple_id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  return { token, expiresAt, userId };
}

async function storeRefreshToken(userId, token, expiresAt) {
  await db('refresh_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });
}

async function verifyRefreshToken(token) {
  const record = await db('refresh_tokens')
    .where({ token, revoked: 0 })
    .where('expires_at', '>', new Date())
    .first();

  if (!record) return null;
  return record;
}

async function revokeRefreshToken(token) {
  await db('refresh_tokens').where({ token }).update({ revoked: 1 });
}

async function revokeAllUserTokens(userId) {
  await db('refresh_tokens').where({ user_id: userId }).update({ revoked: 1 });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS,
};
