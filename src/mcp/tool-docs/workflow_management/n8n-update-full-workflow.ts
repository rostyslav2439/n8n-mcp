import { ToolDocumentation } from '../types';

export const n8nUpdateFullWorkflowDoc: ToolDocumentation = {
  name: 'n8n_update_full_workflow',
  category: 'workflow_management',
  essentials: {
    description: 'Full workflow update. Requires complete nodes[] and connections{}. For incremental use n8n_update_partial_workflow.',
    keyParameters: ['id', 'nodes', 'connections'],
    example: 'n8n_update_full_workflow({id: "wf_123", nodes: [...], connections: {...}})',
    performance: 'Network-dependent',
    tips: [
      'Must provide complete workflow',
      'Use update_partial for small changes',
      'Validate before updating'
    ]
  },
  full: {
    description: 'Performs a complete workflow update by replacing the entire workflow definition. Requires providing the complete nodes array and connections object, even for small changes. This is a full replacement operation - any nodes or connections not included will be removed.',
    parameters: {
      id: { type: 'string', required: true, description: 'Workflow ID to update' },
      name: { type: 'string', description: 'New workflow name (optional)' },
      nodes: { type: 'array', description: 'Complete array of workflow nodes (required if modifying structure)' },
      connections: { type: 'object', description: 'Complete connections object (required if modifying structure)' },
      settings: { type: 'object', description: 'Workflow settings to update (timezone, error handling, etc.)' }
    },
    returns: 'Updated workflow object with all fields including the changes applied',
    examples: [
      'n8n_update_full_workflow({id: "abc", name: "New Name"}) - Rename only',
      'n8n_update_full_workflow({id: "xyz", nodes: [...], connections: {...}}) - Full structure update',
      'const wf = n8n_get_workflow({id}); wf.nodes.push(newNode); n8n_update_full_workflow(wf); // Add node'
    ],
    useCases: [
      'Major workflow restructuring',
      'Bulk node updates',
      'Workflow imports/cloning',
      'Complete workflow replacement',
      'Settings changes'
    ],
    performance: 'Network-dependent - typically 200-500ms. Larger workflows take longer. Consider update_partial for better performance.',
    bestPractices: [
      'Get workflow first, modify, then update',
      'Validate with validate_workflow before updating',
      'Use update_partial for small changes',
      'Test updates in non-production first'
    ],
    pitfalls: [
      'Requires N8N_API_URL and N8N_API_KEY configured',
      'Must include ALL nodes/connections',
      'Missing nodes will be deleted',
      'Can break active workflows',
      'No partial updates - use update_partial instead'
    ],
    relatedTools: ['n8n_get_workflow', 'n8n_update_partial_workflow', 'validate_workflow', 'n8n_create_workflow']
  }
};