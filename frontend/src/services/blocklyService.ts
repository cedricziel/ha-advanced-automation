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
      console.log('Fetching toolbox configuration from backend...', API_BASE_URL);

      // Fetch custom blocks from backend
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/blockly/toolbox`);
        console.log('Received response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
      } catch (fetchError) {
        console.error('Network error during fetch:', fetchError);
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      if (!response.ok) {
        console.error('Backend response not OK:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Failed to fetch toolbox configuration: ${response.status} ${response.statusText}`);
      }

      let text;
      try {
        text = await response.text();
        console.log('Raw response text length:', text.length);
        console.log('Raw response text preview:', text.substring(0, 200) + '...');
      } catch (textError) {
        console.error('Error reading response text:', textError);
        throw new Error(`Failed to read response: ${textError instanceof Error ? textError.message : 'Unknown error'}`);
      }

      let customConfig;
      try {
        customConfig = JSON.parse(text);
        console.log('Successfully parsed JSON response');
        console.log('Custom config structure:', {
          hasToolbox: !!customConfig.toolbox,
          toolboxKind: customConfig.toolbox?.kind,
          numBlocks: customConfig.blocks?.length,
          toolboxContents: customConfig.toolbox?.contents?.length
        });
      } catch (error) {
        const parseError = error as Error;
        console.error('Failed to parse backend response:', parseError);
        console.error('Invalid JSON text:', text);
        throw new Error(`Invalid JSON response from backend: ${parseError.message}`);
      }

      if (!customConfig.toolbox || !customConfig.blocks) {
        console.error('Invalid toolbox configuration:', customConfig);
        throw new Error('Toolbox configuration is missing required fields');
      }

      console.log('Standard blocks:', {
        categories: standardBlocks.categories.length,
        definitions: standardBlocks.definitions.length
      });
      console.log('Custom blocks:', {
        categories: customConfig.toolbox.contents.length,
        blocks: customConfig.blocks.length
      });

      // Combine standard blocks with custom blocks
      const toolbox = {
        kind: 'categoryToolbox',
        contents: [
          // Standard block categories
          ...standardBlocks.categories,
          // Separator
          { kind: 'sep' },
          // Custom block categories from backend
          ...customConfig.toolbox.contents
        ]
      };

      const result = {
        toolbox,
        blocks: [
          ...standardBlocks.definitions,
          ...customConfig.blocks
        ]
      };

      console.log('Final toolbox configuration:', {
        kind: result.toolbox.kind,
        numCategories: result.toolbox.contents.length,
        numBlocks: result.blocks.length
      });

      return result;
    } catch (error) {
      console.error('Error fetching toolbox config:', error);
      throw error;
    }
  }
};
