import { BlocklyToolbox } from '../types/blockly';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const blocklyService = {
  async getToolboxConfig(): Promise<BlocklyToolbox> {
    const response = await fetch(`${API_BASE_URL}/api/blockly/toolbox`);
    if (!response.ok) {
      throw new Error('Failed to fetch toolbox configuration');
    }
    return response.json();
  }
};
