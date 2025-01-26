import React, { useRef, useEffect, useState, useCallback } from 'react';
import './BlocklyWorkspace.css';
import { BlocklyWorkspace as ReactBlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import { initBlockGenerators } from './generators';
import { registerEntityField } from './EntityField';
import { haClient } from '../../services/haClient';
import { blocklyService } from '../../services/blocklyService';
import { BlocklyToolbox } from '../../types/blockly';

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

interface BlocklyWorkspaceProps {
  onWorkspaceChange?: (workspace: Blockly.Workspace) => void;
  initialState?: any;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({ onWorkspaceChange, initialState }) => {
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const generatorRef = useRef<((workspace: Blockly.Workspace) => any) | null>(null);
  const [automationYaml, setAutomationYaml] = useState<string>('');
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
    generatorRef.current = initBlockGenerators();
    registerEntityField();
  }, []);

  // Connect to Home Assistant
  useEffect(() => {
    haClient.connect();
    const unsubscribe = haClient.onStateChanged((entityId, state) => {
      console.log('Entity state changed:', entityId, state);
    });
    return () => unsubscribe();
  }, []);

  // Handle workspace initialization and cleanup
  useEffect(() => {
    let mounted = true;

    return () => {
      mounted = false;
      setAutomationYaml('');
      // Let react-blockly handle workspace disposal
      workspaceRef.current = null;
    };
  }, []);

  // Load initial state when workspace and state are available
  useEffect(() => {
    if (initialState && workspaceRef.current) {
      try {
        Blockly.serialization.workspaces.load(initialState, workspaceRef.current);
      } catch (error) {
        console.error('Error loading initial workspace state:', error);
      }
    }
  }, [initialState]);

  // Debounced workspace change handler
  const debouncedHandleChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (workspace: Blockly.Workspace) => {
        workspaceRef.current = workspace;

        // Clear previous timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
          // Only update if we have a generator and the workspace exists
          if (generatorRef.current && workspace) {
            try {
              const automation = generatorRef.current(workspace);
              if (automation) {
                try {
                  setAutomationYaml(JSON.stringify(automation, null, 2));
                } catch (error) {
                  console.error('Error stringifying automation:', error);
                  setAutomationYaml('');
                }
              } else {
                setAutomationYaml('');
              }
              // Notify parent of changes
              onWorkspaceChange?.(workspace);
            } catch (error) {
              console.error('Error generating automation:', error);
            }
          }
        }, 300); // 300ms debounce
      };
    })(),
    [onWorkspaceChange]
  );

  const handleWorkspaceChange = useCallback((workspace: Blockly.Workspace) => {
    if (!workspace) return;
    workspaceRef.current = workspace;
    debouncedHandleChange(workspace);
  }, [debouncedHandleChange]);

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
        className="blockly-workspace"
      />
    </div>
  );
};

export default BlocklyWorkspace;
