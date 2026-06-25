/**
 * Validates the same base64 token issued by POST /api/auth/login (used by halaman OVT).
 */
function extractOvtBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const alt = req.headers['x-ovt-token'];
  return typeof alt === 'string' ? alt.trim() : '';
}

function requireOvtBearer(req, res, next) {
  const token = extractOvtBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Login halaman OVT diperlukan',
      code: 'OVT_AUTH_REQUIRED'
    });
  }
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split(':');
    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
    req.ovtUsername = username;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.ovtUsername !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Hanya user admin yang dapat menambah karyawan',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
}

module.exports = { requireOvtBearer, requireAdmin, extractOvtBearerToken };
