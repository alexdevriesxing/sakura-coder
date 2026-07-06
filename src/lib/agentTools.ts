export const SAKURA_AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_project_tree',
      description: 'List the visible project tree, excluding generated caches, build outputs, secrets, and dependency folders.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_project',
      description: 'Search text files in the loaded project for a query and return matching paths and lines.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_project_files',
      description: 'Read multiple project-relative text files. Secret-like files are blocked by the host.',
      parameters: {
        type: 'object',
        properties: {
          relativePaths: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 24,
          },
        },
        required: ['relativePaths'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_file_changes',
      description: 'Propose a batch of file changes for Sakura to display in the diff approval gate.',
      parameters: {
        type: 'object',
        properties: {
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                relativePath: { type: 'string' },
                action: { type: 'string', enum: ['create', 'modify', 'delete', 'rename'] },
                newRelativePath: { type: 'string' },
                reason: { type: 'string' },
                newContent: { type: 'string' },
                riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              },
              required: ['relativePath', 'action', 'reason', 'riskLevel'],
              additionalProperties: false,
            },
          },
        },
        required: ['changes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_safe_command',
      description: 'Run a validation command through Sakura safety gates. Destructive commands are blocked.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
        },
        required: ['command'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refresh_visual_preview',
      description: 'Ask the host to refresh the visual preview after approved changes are applied.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'build_semantic_index',
      description: 'Build or refresh the local semantic index for symbols, imports, and file previews.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_semantic_index',
      description: 'Query the local hybrid lexical/symbol index for relevant files.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_diagnostics',
      description: 'Collect TypeScript, ESLint, Rust, and parsed command diagnostics when available.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Inspect the current Git branch and dirty files.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Read the current Git diff. Use staged=true for staged changes.',
      parameters: {
        type: 'object',
        properties: { staged: { type: 'boolean' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_checkpoints',
      description: 'List named local checkpoints that can be restored after user approval.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_rules',
      description: 'List AGENTS.md and .sakura/rules instructions active in the project.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_memories',
      description: 'List local Sakura memories captured for this project.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_mcp_servers',
      description: 'List configured MCP servers and approval policies from .sakura/mcp.json.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'call_mcp_tool',
      description: 'Call an enabled MCP tool through the local approval bridge.',
      parameters: {
        type: 'object',
        properties: {
          serverId: { type: 'string' },
          toolName: { type: 'string' },
          args: { type: 'object' },
        },
        required: ['serverId', 'toolName', 'args'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_preview_check',
      description: 'Inspect preview configuration and return URL/session notes for browser-debug automation.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_background_job',
      description: 'Create a resumable local Sakura job for long-running agent work.',
      parameters: {
        type: 'object',
        properties: { goal: { type: 'string' } },
        required: ['goal'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_background_jobs',
      description: 'List local resumable Sakura jobs and their logs.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
] as const;

export function createAgentToolInstructions(): string {
  return [
    'HOST TOOL ACCESS:',
    '- Sakura can list/search/read project files, propose batch diffs, apply approved changes, run safe validation commands, and refresh visual previews.',
    '- Sakura also exposes diagnostics, Git status/diffs, semantic retrieval, rules/memory, MCP discovery, checkpoints, preview checks, and local background jobs.',
    '- Never claim a tool ran unless Sakura returns a tool result.',
    '- Prefer propose_file_changes for edits. The host will route changes through the diff approval gate.',
    '- Secret-like files are excluded from reads and writes.',
  ].join('\n');
}
