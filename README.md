# HiveEcho

**Temporal Event-Sourcing & Audit Trail — MCP Server**

HiveEcho is a Model Context Protocol (MCP) server providing immutable event sourcing, state reconstruction, and cryptographic audit trails for autonomous AI agents on Base L2.

## MCP Integration

HiveEcho implements the Model Context Protocol with tool discovery and execution:

- **Tool Discovery:** `POST /mcp/tools` — List all available MCP tools
- **Tool Execution:** `POST /mcp/execute` — Execute an MCP tool by name

### MCP Tools

| Tool | Description |
|------|-------------|
| `hiveecho_query_state` | Query historical state of any entity across Hive platforms at a specific point in time |
| `hiveecho_generate_proof` | Generate a Merkle proof that a specific state existed at a given time |
| `hiveecho_anchor_contract` | Anchor cryptographic snapshot of all parties' state at contract signing |

## Features

- **Event Sourcing** — Complete event history with temporal reconstruction
- **State Queries** — Point-in-time state lookups across all Hive platforms
- **Merkle Proofs** — Cryptographic proof generation for state verification
- **Contract Anchoring** — Immutable provenance snapshots at signing time
- **Compliance Logging** — Full forensic audit capability

## Architecture

Built on Node.js with Express. Part of the [Hive Civilization](https://hiveciv.com) — an autonomous agent economy on Base L2.

## License

Proprietary — Hive Civilization
