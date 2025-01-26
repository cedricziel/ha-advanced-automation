import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import './BlocklyWorkspace.css';
import { BlocklyWorkspace as ReactBlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import { initBlockGenerators, BlockExtractor } from './generators';
import { registerEntityField } from './EntityField';
import { haClient } from '../../services/haClient';
import { blocklyService } from '../../services/blocklyService';
import { BlocklyToolbox, BlockDefinition } from '../../types/blockly';
import { TriggerDefinition, ConditionDefinition } from '../../types/automation';

function createEntityField(defaultValue: string) {
  const EntityFieldClass = Blockly.registry.getClass('field', 'field_entity');
  return EntityFieldClass ? new EntityFieldClass(defaultValue) : new Blockly.FieldTextInput(defaultValue);
}

interface ProcessedBlockArg {
  type: string;
  name: string;
  text: string;
  customField?: boolean;
}

interface ProcessedBlockDefinition extends Omit<BlockDefinition, 'args0'> {
  args0: ProcessedBlockArg[];
}

interface BlocklyField {
  name: string;
  sourceBlock_: any;
  init: () => void;
  setSourceBlock: (block: any) => void;
}

interface BlocklyInput {
  fieldRow: BlocklyField[];
}

function registerBlocks(blocks: BlockDefinition[]) {
  // Clear any existing block definitions
  blocks.forEach(block => {
    delete Blockly.Blocks[block.type];
  });

  const blockDefinitions = blocks.map(block => ({
    ...block,
    args0: block.args0.map(arg => {
      if (arg.type === 'field_entity') {
        return {
          type: 'field_input', // We'll replace this with our custom field
          name: arg.name,
          text: arg.default,
          customField: true, // Mark for post-processing
        };
      }
      return {
        type: arg.type,
        name: arg.name,
        text: arg.default,
      };
    }),
  })) as ProcessedBlockDefinition[];

  // Register the blocks
  Blockly.defineBlocksWithJsonArray(blockDefinitions);

  // Post-process to add custom entity fields
  blockDefinitions.forEach(block => {
    const originalInit = Blockly.Blocks[block.type].init;
    Blockly.Blocks[block.type].init = function(this: any) {
      originalInit.call(this);

      // Replace marked fields with entity fields
      block.args0.forEach(arg => {
        if (arg.type === 'field_entity') {
          const input = this.inputList[0] as BlocklyInput;
          const fieldIndex = input.fieldRow.findIndex(f => f.name === arg.name);
          if (fieldIndex !== -1) {
            const entityField = createEntityField(arg.text) as BlocklyField;
            input.fieldRow[fieldIndex] = entityField;
            entityField.setSourceBlock(this);
            entityField.init();
            entityField.name = arg.name;
          }
        }
      });
    };
  });
}

interface WorkspaceChangeData {
  workspace: any; // Blockly workspace serialization
  triggers: TriggerDefinition[];
  conditions: ConditionDefinition[];
}

interface BlocklyWorkspaceProps {
  onWorkspaceChange?: (data: WorkspaceChangeData) => void;
  initialState?: any;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = memo(({ onWorkspaceChange, initialState }) => {
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const extractorRef = useRef<BlockExtractor | null>(null);
  const hasLoadedStateRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const [toolboxConfig, setToolboxConfig] = useState<BlocklyToolbox | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch toolbox configuration and initialize blocks
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize generators and custom fields
        extractorRef.current = initBlockGenerators();
        registerEntityField();

        // Fetch toolbox config and blocks
        const response = await blocklyService.getToolboxConfig();
        setToolboxConfig(response.toolbox);

        // Register blocks
        registerBlocks(response.blocks);

        setError(null);
      } catch (err) {
        console.error('Error initializing workspace:', err);
        setError('Failed to initialize workspace');
      }
    };
    initialize();
  }, []);

  // Connect to Home Assistant
  useEffect(() => {
    haClient.connect();
    const unsubscribe = haClient.onStateChanged((entityId, state) => {
      // Keep subscription active to ensure state updates are received
      if (!isUnmountedRef.current) {
        // State changes will update the EntityField dropdowns
      }
    });
    return () => {
      isUnmountedRef.current = true;
      unsubscribe();
    };
  }, []);

  // Handle workspace changes
  const handleWorkspaceChange = useCallback((workspace: Blockly.Workspace) => {
    if (!workspace || isUnmountedRef.current || !extractorRef.current) return;

    // Don't trigger changes while loading initial state
    if (!hasLoadedStateRef.current && initialState) return;

    try {
      const state = Blockly.serialization.workspaces.save(workspace);
      const triggers = extractorRef.current.extractTriggers(workspace);
      const conditions = extractorRef.current.extractConditions(workspace);

      onWorkspaceChange?.({
        workspace: state,
        triggers,
        conditions
      });
    } catch (error) {
      console.error('Error generating automation:', error);
    }
  }, [onWorkspaceChange, initialState, hasLoadedStateRef]);

  // Handle workspace initialization
  const onInject = useCallback((workspace: Blockly.Workspace) => {
    workspaceRef.current = workspace;

    // Only attempt to load state if we have both initialState and toolbox
    if (initialState && toolboxConfig) {
      try {
        workspace.clear();
        Blockly.serialization.workspaces.load(initialState, workspace);
        hasLoadedStateRef.current = true;
      } catch (error) {
        console.error('Error loading initial workspace state:', error);
      }
    }
  }, [initialState, toolboxConfig]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      workspaceRef.current = null;
      hasLoadedStateRef.current = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        {error}
      </div>
    );
  }

  if (!toolboxConfig) {
    return (
      <div style={{ padding: '20px' }}>
        Loading workspace...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactBlocklyWorkspace
        toolboxConfiguration={toolboxConfig}
        workspaceConfiguration={{
          grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
          },
          readOnly: false,
          trashcan: true,
          move: {
            scrollbars: true,
            drag: true,
            wheel: true
          }
        }}
        onWorkspaceChange={handleWorkspaceChange}
        onInject={onInject}
        className="blockly-workspace"
      />
    </div>
  );
});

export default BlocklyWorkspace;
