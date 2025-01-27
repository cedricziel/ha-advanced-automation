import { BlockDefinition, UserBlockDefinition, CreateUserBlockRequest, UpdateUserBlockRequest } from '../types/blockly';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const blockService = {
  // Standard blocks
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

  // User-defined blocks
  async listUserBlocks(): Promise<UserBlockDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/api/blocks/user`);
    if (!response.ok) {
      throw new Error('Failed to fetch user blocks');
    }
    return response.json();
  },

  async createUserBlock(block: CreateUserBlockRequest): Promise<UserBlockDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/blocks/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(block),
    });
    if (!response.ok) {
      throw new Error('Failed to create user block');
    }
    return response.json();
  },

  async updateUserBlock(id: string, block: UpdateUserBlockRequest): Promise<UserBlockDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/blocks/user/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(block),
    });
    if (!response.ok) {
      throw new Error('Failed to update user block');
    }
    return response.json();
  },

  async deleteUserBlock(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/blocks/user/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete user block');
    }
  },
};
