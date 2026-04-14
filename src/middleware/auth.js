export function requireDID(req, res, next) {
  const did = req.headers['x-did'] || req.headers['authorization']?.replace('DID ', '');

  if (!did) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing DID. Provide x-did header or Authorization: DID <your-did>'
    });
  }

  req.did = did;
  next();
}

export function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_KEY || 'hive-admin-key';

  if (adminKey !== expectedKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin key required for this operation'
    });
  }

  next();
}

export function requireInternal(req, res, next) {
  const internalKey = req.headers['x-internal-key'];
  const expectedKey = process.env.INTERNAL_KEY || 'hive-internal-key';

  if (internalKey !== expectedKey) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Internal key required. Only Hive services may push state.'
    });
  }

  next();
}
