import express from 'express';
import cors from 'cors';
import echoRoutes from './routes/echo.js';
import { getMcpToolsList, executeMcpTool } from './services/mcp-tools.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

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
