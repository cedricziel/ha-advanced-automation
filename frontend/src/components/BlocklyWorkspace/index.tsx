import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import './BlocklyWorkspace.css';
import { BlocklyWorkspace as ReactBlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import { initBlockGenerators, BlockExtractor } from './generators';
import { registerEntityField } from './EntityField';
import { haClient } from '../../services/haClient';
import { blocklyService } from '../../services/blocklyService';
import { BlocklyToolbox } from '../../types/blockly';
import { TriggerDefinition, ConditionDefinition } from '../../types/automation';

function createEntityField(defaultValue: string) {
  const EntityFieldClass = Blockly.registry.getClass('field', 'field_entity');
  return EntityFieldClass ? new EntityFieldClass(defaultValue) : new Blockly.FieldTextInput(defaultValue);
}

// Define custom blocks
Blockly.Blocks['ha_state_trigger'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("When entity")
        .appendField(createEntityField("entity.id"), "ENTITY_ID")
        .appendField("changes to")
        .appendField(new Blockly.FieldTextInput("state"), "STATE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Triggers when an entity changes to a specific state");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_time_trigger'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("At time")
        .appendField(new Blockly.FieldTextInput("00:00"), "TIME");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Triggers at a specific time");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_state_condition'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Entity")
        .appendField(createEntityField("entity.id"), "ENTITY_ID")
        .appendField("is")
        .appendField(new Blockly.FieldTextInput("state"), "STATE");
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("Check if an entity is in a specific state");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_time_condition'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Time is between")
        .appendField(new Blockly.FieldTextInput("00:00"), "START_TIME")
        .appendField("and")
        .appendField(new Blockly.FieldTextInput("23:59"), "END_TIME");
    this.setOutput(true, "Boolean");
    this.setColour(120);
    this.setTooltip("Check if current time is within a specific range");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_call_service'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Call service")
        .appendField(new Blockly.FieldTextInput("domain.service"), "SERVICE");
    this.appendDummyInput()
        .appendField("with entity")
        .appendField(createEntityField("entity.id"), "ENTITY_ID");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(60);
    this.setTooltip("Call a Home Assistant service");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_set_state'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Set")
        .appendField(createEntityField("entity.id"), "ENTITY_ID")
        .appendField("to")
        .appendField(new Blockly.FieldTextInput("state"), "STATE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(60);
    this.setTooltip("Set an entity to a specific state");
    this.setHelpUrl("");
  }
};

interface WorkspaceChangeData {
  workspace: any; // Blockly workspace serialization
  triggers: TriggerDefinition[];
  conditions: ConditionDefinition[];
}

interface BlocklyWorkspaceProps {
  onWorkspaceChange?: (data: WorkspaceChangeData) => void;
  initialState?: any;
}

// Debounce function outside component to prevent recreation
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = memo(({ onWorkspaceChange, initialState }) => {
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const extractorRef = useRef<BlockExtractor | null>(null);
  const isInitializedRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const [toolboxConfig, setToolboxConfig] = useState<BlocklyToolbox | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch toolbox configuration
  useEffect(() => {
    const fetchToolboxConfig = async () => {
      try {
        const config = await blocklyService.getToolboxConfig();
        setToolboxConfig(config);
        setError(null);
      } catch (err) {
        console.error('Error fetching toolbox config:', err);
        setError('Failed to load toolbox configuration');
      }
    };
    fetchToolboxConfig();
  }, []);

  // Initialize block generators and custom fields
  useEffect(() => {
    extractorRef.current = initBlockGenerators();
    registerEntityField();
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

  // Memoized workspace change handler
  const handleWorkspaceChange = useCallback((workspace: Blockly.Workspace) => {
    if (!workspace || isUnmountedRef.current) return;
    workspaceRef.current = workspace;

    // Debounce the state update
    const debouncedUpdate = debounce(() => {
      if (extractorRef.current && workspace && !isUnmountedRef.current) {
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
      }
    }, 300);

    debouncedUpdate();
  }, [onWorkspaceChange, isUnmountedRef]);

  // Handle workspace initialization
  const onInject = useCallback((workspace: Blockly.Workspace) => {
    workspaceRef.current = workspace;

    // Clear workspace first to prevent state mixing
    workspace.clear();

    // Load initial state if available and toolbox is ready
    if (initialState && toolboxConfig) {
      // Small delay to ensure workspace is fully initialized
      setTimeout(() => {
        if (!isUnmountedRef.current && workspace) {
          try {
            Blockly.serialization.workspaces.load(initialState, workspace);
          } catch (error) {
            console.error('Error loading initial workspace state:', error);
          }
        }
      }, 100);
    }
  }, [initialState, toolboxConfig]);

  // Reset workspace when initialState changes
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.clear();
      if (initialState && toolboxConfig) {
        try {
          Blockly.serialization.workspaces.load(initialState, workspace);
        } catch (error) {
          console.error('Error loading initial workspace state:', error);
        }
      }
    }
  }, [initialState, toolboxConfig]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      workspaceRef.current = null;
      isInitializedRef.current = false;
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
