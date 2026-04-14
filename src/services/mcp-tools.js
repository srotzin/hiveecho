import { getState, generateProof, anchorContract } from './temporal-engine.js';

export const mcpTools = [
  {
    name: 'hiveecho_query_state',
    description: 'Query the historical state of any entity across Hive platforms. Returns the state at a specific point in time or the current state.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['hivetrust', 'hivemind', 'hiveforge', 'hivelaw', 'simpson'],
          description: 'The Hive platform to query'
        },
        entity_id: {
          type: 'string',
          description: 'The entity ID to look up'
        },
        at: {
          type: 'string',
          description: 'ISO timestamp for historical query (omit for current state)'
        }
      },
      required: ['platform', 'entity_id']
    },
    handler: async ({ platform, entity_id, at }) => {
      const result = getState(platform, entity_id, at);
      if (!result) {
        return { error: 'State not found', platform, entity_id };
      }
      return result;
    }
  },
  {
    name: 'hiveecho_generate_proof',
    description: 'Generate a Merkle proof that a specific state existed at a given time. Returns cryptographic proof path for verification.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['hivetrust', 'hivemind', 'hiveforge', 'hivelaw', 'simpson'],
          description: 'The Hive platform'
        },
        entity_id: {
          type: 'string',
          description: 'The entity ID'
        },
        timestamp: {
          type: 'string',
          description: 'ISO timestamp of the state to prove'
        },
        state_hash: {
          type: 'string',
          description: 'SHA-256 hash of the state to prove'
        }
      },
      required: ['platform', 'entity_id', 'state_hash']
    },
    handler: async ({ platform, entity_id, timestamp, state_hash }) => {
      const result = generateProof(platform, entity_id, timestamp, state_hash);
      if (!result) {
        return { error: 'Proof not found', message: 'No matching state found for the given parameters' };
      }
      return result;
    }
  },
  {
    name: 'hiveecho_anchor_contract',
    description: 'Anchor the state of all parties at the moment of contract signing. Captures a cryptographic snapshot of all relevant states for immutable provenance.',
    inputSchema: {
      type: 'object',
      properties: {
        contract_id: {
          type: 'string',
          description: 'Unique identifier for the contract'
        },
        parties: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of DID identifiers for contract parties'
        },
        terms_hash: {
          type: 'string',
          description: 'SHA-256 hash of the contract terms'
        },
        value_usdc: {
          type: 'number',
          description: 'Contract value in USDC'
        },
        platform_states: {
          type: 'object',
          description: 'Current platform states to snapshot (e.g., { hivetrust: {...}, hivelaw: {...} })'
        }
      },
      required: ['contract_id', 'parties', 'terms_hash', 'value_usdc']
    },
    handler: async ({ contract_id, parties, terms_hash, value_usdc, platform_states }) => {
      const result = anchorContract({ contract_id, parties, terms_hash, value_usdc, platform_states });
      return result;
    }
  }
];

export function getMcpToolsList() {
  return mcpTools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }));
}

export async function executeMcpTool(name, args) {
  const tool = mcpTools.find(t => t.name === name);
  if (!tool) {
    return { error: `Unknown tool: ${name}` };
  }
  return tool.handler(args);
}
