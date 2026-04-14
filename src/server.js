import express from 'express';
import cors from 'cors';
import echoRoutes from './routes/echo.js';
import { getMcpToolsList, executeMcpTool } from './services/mcp-tools.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Root Discovery ---
app.get('/', (req, res) => {
  res.json({
    name: 'HiveEcho',
    tagline: 'The Temporal Layer',
    version: '1.0.0',
    status: 'operational',
    platform: {
      name: 'Hive Civilization',
      designation: 'Platform #7',
      network: 'Base L2',
      protocol_version: '2026.1',
      website: 'https://www.hiveagentiq.com',
      documentation: 'https://docs.hiveagentiq.com'
    },
    description: 'Event streaming and notification layer providing time-travel state queries, Merkle proof generation, cryptographic state anchoring, and contract provenance for the Hive Civilization. Records immutable state transitions across all Hive platforms with hash-chained integrity and L2 settlement finality.',
    capabilities: [
      'Temporal state recording with SHA-256 hash chaining',
      'Time-travel queries across platform state history',
      'Merkle proof generation for cryptographic state verification',
      'Contract anchoring — snapshot all party states at signing moment',
      'L2 anchor settlement on Base network',
      'Cross-platform state tracking (HiveTrust, HiveMind, HiveForge, HiveLaw, Simpson)',
      'Model Context Protocol (MCP) tool integration',
      'X402 payment protocol with dynamic pricing'
    ],
    endpoints: {
      health: 'GET /health',
      record_state: 'POST /v1/echo/record-state',
      get_state: 'GET /v1/echo/state/:platform/:entity_id',
      get_history: 'GET /v1/echo/history/:platform/:entity_id',
      prove: 'POST /v1/echo/prove',
      anchor: 'POST /v1/echo/anchor',
      anchor_contract: 'POST /v1/echo/anchor-contract',
      roots: 'GET /v1/echo/roots',
      stats: 'GET /v1/echo/stats',
      mcp_tools: 'POST /mcp/tools',
      mcp_execute: 'POST /mcp/execute'
    },
    authentication: {
      methods: ['x402-payment', 'api-key', 'DID'],
      payment_rail: 'USDC on Base L2',
      discovery: 'GET /.well-known/ai-plugin.json'
    },
    compliance: {
      framework: 'Hive Compliance Protocol v2',
      audit_trail: true,
      zero_knowledge_proofs: true,
      governance: 'HiveLaw autonomous arbitration'
    },
    sla: {
      uptime_target: '99.9%',
      event_delivery_p95: '< 50ms',
      settlement_finality: '< 30 seconds'
    },
    legal: {
      terms_of_service: 'https://www.hiveagentiq.com/terms',
      privacy_policy: 'https://www.hiveagentiq.com/privacy',
      contact: 'protocol@hiveagentiq.com'
    },
    discovery: {
      ai_plugin: '/.well-known/ai-plugin.json',
      agent_card: '/.well-known/agent-card.json',
      agent_card_legacy: '/.well-known/agent.json',
      payment_info: '/.well-known/hive-payments.json',
      service_manifest: '/.well-known/hiveecho.json'
    }
  });
});

// --- AI Plugin Manifest ---
app.get('/.well-known/ai-plugin.json', (req, res) => {
  res.json({
    schema_version: 'v1',
    name_for_human: 'HiveEcho — Event Streaming & Temporal Layer',
    name_for_model: 'hiveecho',
    description_for_human: 'Time-travel state queries, Merkle proofs, and cryptographic state anchoring for the Hive Civilization. Provides immutable provenance and contract anchoring across all Hive platforms.',
    description_for_model: 'HiveEcho is the temporal layer for the Hive Civilization. It records state transitions across platforms (HiveTrust, HiveMind, HiveForge, HiveLaw, Simpson), supports time-travel queries to retrieve historical state at any timestamp, generates Merkle proofs for cryptographic verification, and anchors contract states for immutable provenance. Use it to query historical state, verify state integrity, or anchor contract moments.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: 'https://hiveecho.onrender.com/openapi.json',
      has_user_authentication: false
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf'
    },
    contact_email: 'protocol@hiveagentiq.com',
    legal_info_url: 'https://www.hiveagentiq.com/terms'
  });
});

// --- A2A Agent Card (agent-card.json is the preferred path per A2A Protocol spec) ---
app.get(['/.well-known/agent.json', '/.well-known/agent-card.json'], (req, res) => {
  res.json({
    name: 'HiveEcho',
    description: 'Event streaming and temporal layer providing time-travel state queries, Merkle proof generation, cryptographic state anchoring, and contract provenance across all Hive Civilization platforms.',
    url: 'https://hiveecho.onrender.com',
    version: '1.0.0',
    protocol_version: 'a2a/1.0',
    capabilities: [
      {
        name: 'temporal_state_queries',
        description: 'Record and retrieve state transitions across Hive platforms with time-travel queries to any historical timestamp'
      },
      {
        name: 'merkle_proof_generation',
        description: 'Generate cryptographic Merkle proofs to verify state existence and integrity at any point in time'
      },
      {
        name: 'contract_anchoring',
        description: 'Snapshot all party states at the moment of contract signing for immutable provenance and dispute resolution'
      },
      {
        name: 'l2_settlement',
        description: 'Anchor finalized Merkle blocks to Base L2 network for on-chain settlement and permanent record'
      },
      {
        name: 'cross_platform_tracking',
        description: 'Track state changes across HiveTrust, HiveMind, HiveForge, HiveLaw, and Simpson platforms'
      }
    ],
    authentication: {
      schemes: ['x402', 'api-key', 'DID'],
      credentials_url: 'https://hivegate.onrender.com/v1/gate/onboard'
    },
    payment: {
      protocol: 'x402',
      currency: 'USDC',
      network: 'base',
      address: '0x78B3B3C356E89b5a69C488c6032509Ef4260B6bf'
    },
    provider: {
      organization: 'Hive Agent IQ',
      url: 'https://www.hiveagentiq.com'
    }
  });
});

// --- Health ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hiveecho',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    description: 'HiveEcho — The Temporal Layer'
  });
});

// --- Discovery ---
app.get('/.well-known/hiveecho.json', (req, res) => {
  res.json({
    service: 'hiveecho',
    version: '1.0.0',
    description: 'Time-travel queries, Merkle proofs, and state anchoring for the Hive Civilization',
    endpoints: {
      health: '/health',
      record_state: 'POST /v1/echo/record-state',
      get_state: 'GET /v1/echo/state/:platform/:entity_id',
      get_history: 'GET /v1/echo/history/:platform/:entity_id',
      prove: 'POST /v1/echo/prove',
      anchor: 'POST /v1/echo/anchor',
      anchor_contract: 'POST /v1/echo/anchor-contract',
      roots: 'GET /v1/echo/roots',
      stats: 'GET /v1/echo/stats'
    },
    mcp: {
      tools_endpoint: 'POST /mcp/tools',
      execute_endpoint: 'POST /mcp/execute'
    },
    protocols: ['x402', 'DID'],
    network: 'base'
  });
});

// --- Echo Routes ---
app.use('/v1/echo', echoRoutes);

// --- MCP Endpoints ---
app.post('/mcp/tools', (req, res) => {
  res.json({ tools: getMcpToolsList() });
});

app.post('/mcp/execute', async (req, res) => {
  const { tool, arguments: args } = req.body;

  if (!tool) {
    return res.status(400).json({ error: 'Missing tool name' });
  }

  const result = await executeMcpTool(tool, args || {});
  res.json({ result });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`HiveEcho — The Temporal Layer`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Discovery: http://localhost:${PORT}/.well-known/hiveecho.json`);
});

export default app;
