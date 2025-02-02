import { blocklyService } from '../blocklyService';
import { BlocklyToolbox, BlockDefinition } from '../../types/blockly';

describe('BlocklyService', () => {
  let fetchSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getToolboxConfig', () => {
    const mockToolbox: BlocklyToolbox = {
      kind: 'categoryToolbox',
      contents: [
        {
          kind: 'category',
          name: 'Test Category',
          contents: []
        }
      ]
    };

    const mockBlocks: BlockDefinition[] = [
      {
        type: 'test_block',
        message0: 'Test Block',
        previousStatement: true,
        nextStatement: true,
        colour: 210 // Standard Blockly blue
      }
    ];

    const mockResponse = {
      toolbox: mockToolbox,
      blocks: mockBlocks
    };

    it('should fetch and return toolbox configuration successfully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response);

      const result = await blocklyService.getToolboxConfig();

      expect(fetchSpy).toHaveBeenCalledWith('/api/blockly/toolbox');
      expect(result).toEqual(mockResponse);
      expect(consoleLogSpy).toHaveBeenCalledWith('Fetching toolbox configuration from backend...');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      fetchSpy.mockRejectedValueOnce(networkError);

      await expect(blocklyService.getToolboxConfig()).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Network error during fetch:', networkError);
    });

    it('should handle non-OK response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      } as Response);

      await expect(blocklyService.getToolboxConfig()).rejects.toThrow(
        'Failed to fetch toolbox configuration: 500 Internal Server Error'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Backend response not OK:', {
        status: 500,
        statusText: 'Internal Server Error'
      });
    });

    it('should handle invalid JSON response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('invalid json'),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response);

      await expect(blocklyService.getToolboxConfig()).rejects.toThrow('Invalid JSON response from backend');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse backend response:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid JSON text:', 'invalid json');
    });

    it('should handle missing required fields in response', async () => {
      const invalidResponse = { toolbox: mockToolbox }; // missing blocks field

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(invalidResponse)),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response);

      await expect(blocklyService.getToolboxConfig()).rejects.toThrow('Toolbox configuration is missing required fields');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid toolbox configuration:', invalidResponse);
    });

    it('should log successful response details', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response);

      await blocklyService.getToolboxConfig();

      expect(consoleLogSpy).toHaveBeenCalledWith('Successfully parsed JSON response');
      expect(consoleLogSpy).toHaveBeenCalledWith('Config structure:', {
        hasToolbox: true,
        toolboxKind: 'categoryToolbox',
        numBlocks: 1,
        toolboxContents: 1
      });
      expect(consoleLogSpy).toHaveBeenCalledWith('Final toolbox configuration:', {
        kind: 'categoryToolbox',
        numCategories: 1,
        numBlocks: 1
      });
    });

    it('should handle text reading errors', async () => {
      const textError = new Error('Text reading error');
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.reject(textError),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response);

      await expect(blocklyService.getToolboxConfig()).rejects.toThrow('Failed to read response: Text reading error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error reading response text:', textError);
    });
  });
});
