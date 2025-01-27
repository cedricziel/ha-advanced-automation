import { BlocklyToolbox, BlockDefinition } from '../types/blockly';
import { standardBlocks } from './standardBlocks';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ToolboxResponse {
  toolbox: BlocklyToolbox;
  blocks: BlockDefinition[];
}

export const blocklyService = {
  async getToolboxConfig(): Promise<ToolboxResponse> {
    try {
      // Fetch custom blocks from backend
      const response = await fetch(`${API_BASE_URL}/api/blockly/toolbox`);
      if (!response.ok) {
        throw new Error('Failed to fetch toolbox configuration');
      }
      const customConfig = await response.json();

      // Combine standard blocks with custom blocks
      return {
        toolbox: {
          kind: 'categoryToolbox',
          contents: [
            // Standard block categories
            ...standardBlocks.categories,
            // Separator
            { kind: 'sep' },
            // Custom block categories from backend
            ...customConfig.toolbox.contents
          ]
        },
        blocks: [
          ...standardBlocks.definitions,
          ...customConfig.blocks
        ]
      };
    } catch (error) {
      console.error('Error fetching toolbox config:', error);
      throw error;
    }
  }
};
