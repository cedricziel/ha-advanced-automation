import { BlockDefinition } from '../types/blockly';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const blockService = {
  async listBlocks(): Promise<BlockDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/api/blocks`);
    if (!response.ok) {
      throw new Error('Failed to fetch blocks');
    }
    return response.json();
  },

  async createOrUpdateBlock(block: BlockDefinition): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(block),
    });
    if (!response.ok) {
      throw new Error('Failed to create/update block');
    }
  },

  async deleteBlock(blockType: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/blocks/${blockType}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete block');
    }
  },
};
