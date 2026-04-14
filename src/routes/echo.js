import { Router } from 'express';
import { requireDID, requireAdmin, requireInternal } from '../middleware/auth.js';
import { requirePayment, historicalQueryPrice, contractAnchorPrice } from '../middleware/x402.js';
import {
  recordState,
  getState,
  getHistory,
  generateProof,
  anchorRoot,
  anchorContract,
  getRoots,
  getStats
} from '../services/temporal-engine.js';

const router = Router();

const VALID_PLATFORMS = ['hivetrust', 'hivemind', 'hiveforge', 'hivelaw', 'simpson'];
const VALID_ENTITY_TYPES = ['agent', 'transaction', 'dispute', 'memory', 'bounty', 'reputation', 'delegation', 'lease'];

// POST /v1/echo/record-state
router.post('/record-state', requireDID, requireInternal, requirePayment(0), (req, res) => {
  const { platform, entity_type, entity_id, state, previous_state_hash } = req.body;

  if (!platform || !entity_type || !entity_id || !state) {
    return res.status(400).json({ error: 'Missing required fields: platform, entity_type, entity_id, state' });
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` });
  }

  if (!VALID_ENTITY_TYPES.includes(entity_type)) {
    return res.status(400).json({ error: `Invalid entity_type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
  }

  const entry = recordState({ platform, entity_type, entity_id, state, previous_state_hash });

  res.status(201).json({
    success: true,
    state_entry: entry
  });
});

// GET /v1/echo/state/:platform/:entity_id
router.get('/state/:platform/:entity_id', requireDID, requirePayment(historicalQueryPrice), (req, res) => {
  const { platform, entity_id } = req.params;
  const { at } = req.query;

  const result = getState(platform, entity_id, at);

  if (!result) {
    return res.status(404).json({ error: 'State not found', platform, entity_id });
  }

  res.json(result);
});

// GET /v1/echo/history/:platform/:entity_id
router.get('/history/:platform/:entity_id', requireDID, requirePayment(0.10), (req, res) => {
  const { platform, entity_id } = req.params;
  const { from, to, limit } = req.query;

  const entries = getHistory(platform, entity_id, {
    from,
    to,
    limit: limit ? parseInt(limit, 10) : 100
  });

  res.json({
    platform,
    entity_id,
    count: entries.length,
    entries
  });
});

// POST /v1/echo/prove
router.post('/prove', requireDID, requirePayment(0.25), (req, res) => {
  const { platform, entity_id, timestamp, state_hash } = req.body;

  if (!platform || !entity_id || !state_hash) {
    return res.status(400).json({ error: 'Missing required fields: platform, entity_id, state_hash' });
  }

  const result = generateProof(platform, entity_id, timestamp, state_hash);

  if (!result) {
    return res.status(404).json({
      error: 'Proof not found',
      message: 'No matching state found for the given parameters'
    });
  }

  res.json(result);
});

// POST /v1/echo/anchor
router.post('/anchor', requireDID, requireAdmin, requirePayment(0.50), (req, res) => {
  const { force } = req.body || {};

  const result = anchorRoot(!!force);

  if (!result) {
    return res.status(404).json({
      error: 'Nothing to anchor',
      message: 'No unanchored blocks available. Record more states or use force=true.'
    });
  }

  res.json({
    success: true,
    ...result
  });
});

// POST /v1/echo/anchor-contract
router.post('/anchor-contract', requireDID, requirePayment(contractAnchorPrice), (req, res) => {
  const { contract_id, parties, terms_hash, value_usdc, platform_states } = req.body;

  if (!contract_id || !parties || !terms_hash || value_usdc === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: contract_id, parties, terms_hash, value_usdc'
    });
  }

  if (!Array.isArray(parties) || parties.length < 2) {
    return res.status(400).json({ error: 'parties must be an array with at least 2 DIDs' });
  }

  const anchor = anchorContract({ contract_id, parties, terms_hash, value_usdc, platform_states });

  res.status(201).json({
    success: true,
    ...anchor
  });
});

// GET /v1/echo/roots
router.get('/roots', requireDID, requirePayment(0), (req, res) => {
  const { anchored, limit } = req.query;

  const roots = getRoots({
    anchored: anchored !== undefined ? anchored === 'true' : undefined,
    limit: limit ? parseInt(limit, 10) : 50
  });

  res.json({
    count: roots.length,
    roots
  });
});

// GET /v1/echo/stats
router.get('/stats', requireDID, requirePayment(0), (req, res) => {
  res.json(getStats());
});

export default router;
