const jwt = require('jsonwebtoken');
const signAccessToken = (user, method = 'password') => jwt.sign({
    sub: String(user._id), ver: user.tokenVersion || 0, method, authTime: Math.floor(Date.now() / 1000)
}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256', issuer: 'pawear', audience: 'pawear-store'
});
const verifyAccessToken = token => jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'], issuer: 'pawear', audience: 'pawear-store'
});
module.exports = { signAccessToken, verifyAccessToken };
