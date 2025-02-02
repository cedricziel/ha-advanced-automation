import React, { useState, useEffect, useRef } from 'react';
import BlocklyEditor from './index';
import { blocklyService } from '../../services/blocklyService';
import { BlocklyToolbox, WorkspaceState } from '../../types/blockly';
import { Button, Box } from '@mui/material';

const BlocklyEditorTest: React.FC = () => {
  const [toolbox, setToolbox] = useState<BlocklyToolbox | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const blocklyEditorRef = useRef<BlocklyEditor>(null);

  useEffect(() => {
    const loadToolbox = async () => {
      try {
        console.log('Starting toolbox configuration load...');
        setIsLoading(true);
        setError(null);

        const config = await blocklyService.getToolboxConfig();
        console.log('Toolbox config loaded successfully:', {
          hasToolbox: !!config.toolbox,
          hasBlocks: !!config.blocks,
          numCategories: config.toolbox.contents.length,
          numBlocks: config.blocks.length
        });

        // Validate the toolbox configuration
        if (!config.toolbox || !config.blocks) {
          throw new Error('Invalid toolbox configuration: missing required fields');
        }

        if (!config.toolbox.contents || !Array.isArray(config.toolbox.contents)) {
          throw new Error('Invalid toolbox configuration: contents must be an array');
        }

        // Create the combined toolbox with proper type checking
        const combinedToolbox: BlocklyToolbox = {
          kind: 'categoryToolbox',
          contents: config.toolbox.contents
        };

        // Store blocks separately since they're optional in BlocklyToolbox
        if (config.blocks && config.blocks.length > 0) {
          combinedToolbox.blocks = config.blocks;
        }

        console.log('Setting toolbox with configuration:', {
          kind: combinedToolbox.kind,
          numCategories: combinedToolbox.contents.length,
          numBlocks: combinedToolbox.blocks?.length ?? 0
        });

        setToolbox(combinedToolbox);
        setError(null);
      } catch (error) {
        console.error('Failed to load toolbox:', error);
        setError(error instanceof Error ? error.message : 'Failed to load toolbox');
        setToolbox(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    loadToolbox();
  }, []);

  const handleError = (error: Error) => {
    console.error('Blockly editor error:', error);
    setError(error.message);
  };

  const handleSave = () => {
    const state = blocklyEditorRef.current?.getWorkspaceState();
    if (state) {
      console.log('Current workspace state:', state);
    }
  };

  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px', whiteSpace: 'pre-wrap' }}>
        <h3>Error Loading Blockly Editor</h3>
        <div>{error}</div>
        <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
          Check the browser console for more details.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '600px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        Loading Blockly Editor...
      </div>
    );
  }

  if (!toolbox) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        Error: No toolbox configuration available
      </div>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '600px', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Button variant="contained" onClick={handleSave}>
          Save Current State
        </Button>
      </Box>
      <Box sx={{ flex: 1 }}>
        <BlocklyEditor
          ref={blocklyEditorRef}
          toolbox={toolbox}
          onError={handleError}
        />
      </Box>
    </Box>
  );
};

export default BlocklyEditorTest;
