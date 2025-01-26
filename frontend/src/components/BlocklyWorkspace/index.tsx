import React, { useRef, useEffect, useState } from 'react';
import { BlocklyWorkspace as ReactBlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import { initBlockGenerators } from './generators';

// Initial toolbox configuration with basic Home Assistant blocks
const INITIAL_TOOLBOX_JSON = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Triggers",
      colour: "#c30",
      contents: [
        {
          kind: "block",
          type: "ha_state_trigger"
        },
        {
          kind: "block",
          type: "ha_time_trigger"
        }
      ]
    },
    {
      kind: "category",
      name: "Conditions",
      colour: "#2c5",
      contents: [
        {
          kind: "block",
          type: "ha_state_condition"
        },
        {
          kind: "block",
          type: "ha_time_condition"
        }
      ]
    },
    {
      kind: "category",
      name: "Actions",
      colour: "#29b",
      contents: [
        {
          kind: "block",
          type: "ha_call_service"
        },
        {
          kind: "block",
          type: "ha_set_state"
        }
      ]
    }
  ]
};

// Define custom blocks
Blockly.Blocks['ha_state_trigger'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("When entity")
        .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID")
        .appendField("changes to")
        .appendField(new Blockly.FieldTextInput("state"), "STATE");
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
    this.setColour(230);
    this.setTooltip("Triggers at a specific time");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['ha_state_condition'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Entity")
        .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID")
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
        .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID");
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
        .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID")
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
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({ onWorkspaceChange }) => {
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const generatorRef = useRef<((workspace: Blockly.Workspace) => any) | null>(null);
  const [automationYaml, setAutomationYaml] = useState<string>('');

  useEffect(() => {
    // Initialize block generators
    generatorRef.current = initBlockGenerators();
  }, []);

  const handleWorkspaceChange = (workspace: Blockly.Workspace) => {
    workspaceRef.current = workspace;

    if (generatorRef.current) {
      const automation = generatorRef.current(workspace);
      if (automation) {
        setAutomationYaml(JSON.stringify(automation, null, 2));
      }
      onWorkspaceChange?.(workspace);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
      <div style={{ flex: 1 }}>
        <ReactBlocklyWorkspace
          toolboxConfiguration={INITIAL_TOOLBOX_JSON}
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
      <div style={{ flex: 1, padding: '20px', backgroundColor: '#f5f5f5', overflowY: 'auto' }}>
        <h3>Generated Automation</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {automationYaml}
        </pre>
      </div>
    </div>
  );
};

export default BlocklyWorkspace;
