import { blockService } from '../blockService';
import { BlockDefinition, UserBlockDefinition, CreateUserBlockRequest, UpdateUserBlockRequest } from '../../types/blockly';

describe('BlockService', () => {
  let fetchSpy: jest.SpyInstance;
  const API_BASE_URL = 'http://localhost:3001';

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Standard Blocks', () => {
    const mockBlock: BlockDefinition = {
      type: 'test_block',
      message0: 'Test Block',
      previousStatement: true,
      nextStatement: true,
      colour: 210
    };

    describe('listBlocks', () => {
      it('should fetch and return blocks successfully', async () => {
        const mockBlocks = [mockBlock];
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBlocks),
        } as Response);

        const result = await blockService.listBlocks();

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks`);
        expect(result).toEqual(mockBlocks);
      });

      it('should throw error when fetch fails', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

        await expect(blockService.listBlocks()).rejects.toThrow('Failed to fetch blocks');
      });
    });

    describe('createOrUpdateBlock', () => {
      it('should create/update block successfully', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: true,
        } as Response);

        await blockService.createOrUpdateBlock(mockBlock);

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockBlock),
        });
      });

      it('should throw error when creation/update fails', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as Response);

        await expect(blockService.createOrUpdateBlock(mockBlock)).rejects.toThrow('Failed to create/update block');
      });
    });

    describe('deleteBlock', () => {
      it('should delete block successfully', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: true,
        } as Response);

        await blockService.deleteBlock('test_block');

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks/test_block`, {
          method: 'DELETE',
        });
      });

      it('should throw error when deletion fails', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

        await expect(blockService.deleteBlock('test_block')).rejects.toThrow('Failed to delete block');
      });
    });
  });

  describe('User-defined Blocks', () => {
    const mockUserBlock: UserBlockDefinition = {
      id: 'user_block_1',
      type: 'user_test_block',
      message0: 'User Test Block',
      previousStatement: true,
      nextStatement: true,
      colour: 210,
      category: 'test',
      created: '2024-02-02T12:00:00Z',
      modified: '2024-02-02T12:00:00Z'
    };

    describe('listUserBlocks', () => {
      it('should fetch and return user blocks successfully', async () => {
        const mockUserBlocks = [mockUserBlock];
        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserBlocks),
        } as Response);

        const result = await blockService.listUserBlocks();

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks/user`);
        expect(result).toEqual(mockUserBlocks);
      });

      it('should throw error when fetch fails', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

        await expect(blockService.listUserBlocks()).rejects.toThrow('Failed to fetch user blocks');
      });
    });

    describe('createUserBlock', () => {
      it('should create user block successfully', async () => {
        const createRequest: CreateUserBlockRequest = {
          definition: {
            type: 'user_test_block',
            message0: 'User Test Block',
            previousStatement: true,
            nextStatement: true,
            colour: 210,
            category: 'test'
          }
        };

        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserBlock),
        } as Response);

        const result = await blockService.createUserBlock(createRequest);

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createRequest),
        });
        expect(result).toEqual(mockUserBlock);
      });

      it('should throw error when creation fails', async () => {
        const createRequest: CreateUserBlockRequest = {
          definition: {
            type: 'user_test_block',
            message0: 'User Test Block',
            previousStatement: true,
            nextStatement: true,
            colour: 210,
            category: 'test'
          }
        };

        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as Response);

        await expect(blockService.createUserBlock(createRequest)).rejects.toThrow('Failed to create user block');
      });
    });

    describe('updateUserBlock', () => {
      it('should update user block successfully', async () => {
        const updateRequest: UpdateUserBlockRequest = {
          definition: {
            message0: 'Updated User Test Block',
            colour: 220
          }
        };

        fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockUserBlock,
            message0: 'Updated User Test Block',
            colour: 220
          }),
        } as Response);

        const result = await blockService.updateUserBlock('user_block_1', updateRequest);

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks/user/user_block_1`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateRequest),
        });
        expect(result.message0).toBe('Updated User Test Block');
        expect(result.colour).toBe(220);
      });

      it('should throw error when update fails', async () => {
        const updateRequest: UpdateUserBlockRequest = {
          definition: {
            message0: 'Updated User Test Block'
          }
        };

        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

        await expect(blockService.updateUserBlock('user_block_1', updateRequest))
          .rejects.toThrow('Failed to update user block');
      });
    });

    describe('deleteUserBlock', () => {
      it('should delete user block successfully', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: true,
        } as Response);

        await blockService.deleteUserBlock('user_block_1');

        expect(fetchSpy).toHaveBeenCalledWith(`${API_BASE_URL}/api/blocks/user/user_block_1`, {
          method: 'DELETE',
        });
      });

      it('should throw error when deletion fails', async () => {
        fetchSpy.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

        await expect(blockService.deleteUserBlock('user_block_1')).rejects.toThrow('Failed to delete user block');
      });
    });
  });
});
