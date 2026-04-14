import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// --- Data Structures (append-only, in-memory) ---

const stateLog = [];
const currentStates = new Map();
const merkleBlocks = [];
const contractAnchors = new Map();

let globalBlockNumber = 0;
const BLOCK_SIZE = 1000;

// Pending leaves for the current (unfinalized) block
let pendingLeaves = [];

// Stats counters
const stats = {
  statesRecorded: 0,
  proofsGenerated: 0,
  anchorsMade: 0,
  contractsAnchored: 0,
  platformsTracked: new Set()
};

// --- Crypto helpers ---

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function buildMerkleRoot(leafHashes) {
  if (leafHashes.length === 0) return sha256('empty');
  if (leafHashes.length === 1) return leafHashes[0];

  const nextLevel = [];
  for (let i = 0; i < leafHashes.length; i += 2) {
    const left = leafHashes[i];
    const right = leafHashes[i + 1] || left;
    nextLevel.push(sha256(left + right));
  }
  return buildMerkleRoot(nextLevel);
}

function generateMerkleProof(leafHashes, targetIndex) {
  const proof = [];
  let index = targetIndex;
  let level = [...leafHashes];

  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    const sibling = level[Math.min(siblingIndex, level.length - 1)];
    proof.push({ hash: sibling, position: index % 2 === 0 ? 'right' : 'left' });

    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || left;
      nextLevel.push(sha256(left + right));
    }
    level = nextLevel;
    index = Math.floor(index / 2);
  }

  return { root: level[0], path: proof };
}

// --- State hash chaining ---

function computeStateHash(entityId, state, prevHash, timestamp) {
  return sha256(entityId + JSON.stringify(state) + prevHash + timestamp);
}

// --- Internal: finalize a Merkle block ---

function finalizeBlock(force = false) {
  if (pendingLeaves.length === 0) return null;
  if (!force && pendingLeaves.length < BLOCK_SIZE) return null;

  globalBlockNumber++;
  const rootHash = buildMerkleRoot(pendingLeaves);
  const now = new Date().toISOString();

  const block = {
    block_number: globalBlockNumber,
    root_hash: rootHash,
    event_count: pendingLeaves.length,
    leaf_hashes: [...pendingLeaves],
    anchored: false,
    anchor_tx_hash: null,
    simulated: false,
    created_at: now
  };

  merkleBlocks.push(block);
  pendingLeaves = [];
  return block;
}

// --- Public API ---

export function recordState({ platform, entity_type, entity_id, state, previous_state_hash }) {
  const key = `${platform}:${entity_id}`;
  const existing = currentStates.get(key);
  const prevHash = previous_state_hash || (existing ? existing.state_hash : sha256('genesis'));
  const now = new Date().toISOString();
  const stateHash = computeStateHash(entity_id, state, prevHash, now);

  const entry = {
    id: uuidv4(),
    platform,
    entity_type,
    entity_id,
    state,
    state_hash: stateHash,
    prev_hash: prevHash,
    block_number: globalBlockNumber + 1,
    recorded_at: now
  };

  stateLog.push(entry);
  currentStates.set(key, entry);
  pendingLeaves.push(stateHash);

  stats.statesRecorded++;
  stats.platformsTracked.add(platform);

  // Auto-finalize if block is full
  if (pendingLeaves.length >= BLOCK_SIZE) {
    finalizeBlock(true);
  }

  return entry;
}

export function getState(platform, entityId, atTimestamp) {
  const key = `${platform}:${entityId}`;

  if (!atTimestamp) {
    const current = currentStates.get(key);
    if (!current) return null;
    return { ...current, is_historical: false };
  }

  const at = new Date(atTimestamp).getTime();
  const matches = stateLog.filter(
    e => e.platform === platform && e.entity_id === entityId && new Date(e.recorded_at).getTime() <= at
  );

  if (matches.length === 0) return null;
  return { ...matches[matches.length - 1], is_historical: true };
}

export function getHistory(platform, entityId, { from, to, limit = 100 } = {}) {
  let entries = stateLog.filter(
    e => e.platform === platform && e.entity_id === entityId
  );

  if (from) {
    const fromMs = new Date(from).getTime();
    entries = entries.filter(e => new Date(e.recorded_at).getTime() >= fromMs);
  }
  if (to) {
    const toMs = new Date(to).getTime();
    entries = entries.filter(e => new Date(e.recorded_at).getTime() <= toMs);
  }

  return entries.slice(0, limit);
}

export function generateProof(platform, entityId, timestamp, stateHash) {
  // Find the state entry matching the criteria
  const entry = stateLog.find(
    e => e.platform === platform &&
         e.entity_id === entityId &&
         e.state_hash === stateHash
  );

  if (!entry) return null;

  // Find which block contains this hash, checking finalized blocks first
  for (const block of merkleBlocks) {
    const idx = block.leaf_hashes.indexOf(stateHash);
    if (idx !== -1) {
      const proof = generateMerkleProof(block.leaf_hashes, idx);
      stats.proofsGenerated++;
      return {
        proof: {
          root_hash: proof.root,
          path: proof.path,
          leaf_hash: stateHash
        },
        block_number: block.block_number,
        anchored: block.anchored,
        anchor_tx_hash: block.anchor_tx_hash,
        simulated: block.simulated
      };
    }
  }

  // Check pending leaves (not yet in a finalized block)
  const pendingIdx = pendingLeaves.indexOf(stateHash);
  if (pendingIdx !== -1) {
    const proof = generateMerkleProof(pendingLeaves, pendingIdx);
    stats.proofsGenerated++;
    return {
      proof: {
        root_hash: proof.root,
        path: proof.path,
        leaf_hash: stateHash
      },
      block_number: globalBlockNumber + 1,
      anchored: false,
      anchor_tx_hash: null,
      simulated: false
    };
  }

  return null;
}

export function anchorRoot(force = false) {
  // Finalize current block if forced or if block is full
  let block = finalizeBlock(force);

  // If no new block was finalized, anchor the latest unanchored block
  if (!block) {
    block = merkleBlocks.filter(b => !b.anchored).pop();
  }

  if (!block) return null;

  const now = new Date().toISOString();
  const simulatedTxHash = `0xsim_${sha256(block.root_hash + now)}`;

  block.anchored = true;
  block.anchor_tx_hash = simulatedTxHash;
  block.simulated = true;
  block.anchored_at = now;

  stats.anchorsMade++;

  return {
    root_hash: block.root_hash,
    event_count: block.event_count,
    anchor_tx_hash: simulatedTxHash,
    anchored_at: now,
    simulated: true,
    block_number: block.block_number
  };
}

export function anchorContract({ contract_id, parties, terms_hash, value_usdc, platform_states }) {
  const anchorId = uuidv4();
  const now = new Date().toISOString();

  // Capture all party states at contract moment
  const allPartyStates = {};
  for (const did of parties) {
    allPartyStates[did] = {};
    for (const [key, entry] of currentStates.entries()) {
      if (entry.state && entry.state.did === did) {
        allPartyStates[did][key] = {
          state: entry.state,
          state_hash: entry.state_hash,
          recorded_at: entry.recorded_at
        };
      }
    }
  }

  // Hash all contract data
  const contractData = JSON.stringify({
    contract_id,
    parties,
    terms_hash,
    value_usdc,
    platform_states,
    all_party_states: allPartyStates,
    anchored_at: now
  });
  const contractHash = sha256(contractData);
  const stateRoot = buildMerkleRoot(
    Object.values(allPartyStates)
      .flatMap(p => Object.values(p))
      .map(s => s.state_hash || sha256(JSON.stringify(s)))
  );

  const anchor = {
    anchor_id: anchorId,
    contract_id,
    contract_hash: contractHash,
    state_root: stateRoot,
    parties,
    terms_hash,
    value_usdc,
    platform_states,
    all_party_states: allPartyStates,
    anchored_at: now
  };

  contractAnchors.set(anchorId, anchor);
  stats.contractsAnchored++;

  return anchor;
}

export function getRoots({ anchored, limit = 50 } = {}) {
  let roots = [...merkleBlocks];

  if (anchored !== undefined) {
    roots = roots.filter(b => b.anchored === anchored);
  }

  return roots.slice(-limit).map(b => ({
    block_number: b.block_number,
    root_hash: b.root_hash,
    event_count: b.event_count,
    anchored: b.anchored,
    anchor_tx_hash: b.anchor_tx_hash,
    simulated: b.simulated,
    created_at: b.created_at,
    anchored_at: b.anchored_at || null
  }));
}

export function getStats() {
  return {
    states_recorded: stats.statesRecorded,
    proofs_generated: stats.proofsGenerated,
    anchors_made: stats.anchorsMade,
    contracts_anchored: stats.contractsAnchored,
    platforms_tracked: [...stats.platformsTracked],
    total_blocks: merkleBlocks.length,
    pending_events: pendingLeaves.length,
    block_size: BLOCK_SIZE
  };
}
