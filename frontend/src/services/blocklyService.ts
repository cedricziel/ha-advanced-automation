import { BlocklyToolbox, BlockDefinition } from '../types/blockly';

interface ToolboxResponse {
  toolbox: BlocklyToolbox;
  blocks: BlockDefinition[];
}

export const blocklyService = {
  async getToolboxConfig(): Promise<ToolboxResponse> {
    try {
      console.log('Fetching toolbox configuration from backend...');

      let response;
      try {
        response = await fetch(`/api/blockly/toolbox`);
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

      let config;
      try {
        config = JSON.parse(text);
        console.log('Successfully parsed JSON response');
        console.log('Config structure:', {
          hasToolbox: !!config.toolbox,
          toolboxKind: config.toolbox?.kind,
          numBlocks: config.blocks?.length,
          toolboxContents: config.toolbox?.contents?.length
        });
      } catch (error) {
        const parseError = error as Error;
        console.error('Failed to parse backend response:', parseError);
        console.error('Invalid JSON text:', text);
        throw new Error(`Invalid JSON response from backend: ${parseError.message}`);
      }

      if (!config.toolbox || !config.blocks) {
        console.error('Invalid toolbox configuration:', config);
        throw new Error('Toolbox configuration is missing required fields');
      }

      console.log('Final toolbox configuration:', {
        kind: config.toolbox.kind,
        numCategories: config.toolbox.contents.length,
        numBlocks: config.blocks.length
      });

      return config;
    } catch (error) {
      console.error('Error fetching toolbox config:', error);
      throw error;
    }
  }
};
