import { BlocklyToolbox, BlockDefinition } from '../types/blockly';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ToolboxResponse {
  toolbox: BlocklyToolbox;
  blocks: BlockDefinition[];
}

export const blocklyService = {
  async getToolboxConfig(): Promise<ToolboxResponse> {
    const response = await fetch(`${API_BASE_URL}/api/blockly/toolbox`);
    if (!response.ok) {
      throw new Error('Failed to fetch toolbox configuration');
    }
    return response.json();
  }
};
