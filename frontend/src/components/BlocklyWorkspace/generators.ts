import * as Blockly from 'blockly';
import { Block } from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

interface AutomationBlock {
  platform?: string;
  condition?: string;
  service?: string;
  entity_id?: string;
  to?: string;
  at?: string;
  after?: string;
  before?: string;
  state?: string;
  target?: {
    entity_id: string;
  };
  data?: {
    entity_id: string;
    state: string;
  };
}

// Initialize blocks

// State Trigger Generator
javascriptGenerator.forBlock['ha_state_trigger'] = function(block: Block) {
  const entityId = block.getFieldValue('ENTITY_ID');
  const state = block.getFieldValue('STATE');

  const yaml: AutomationBlock = {
    platform: 'state',
    entity_id: entityId,
    to: state
  };

  return JSON.stringify(yaml);
};

// Time Trigger Generator
javascriptGenerator.forBlock['ha_time_trigger'] = function(block: Block) {
  const time = block.getFieldValue('TIME');

  const yaml: AutomationBlock = {
    platform: 'time',
    at: time
  };

  return JSON.stringify(yaml);
};

// State Condition Generator
javascriptGenerator.forBlock['ha_state_condition'] = function(block: Block) {
  const entityId = block.getFieldValue('ENTITY_ID');
  const state = block.getFieldValue('STATE');

  const yaml: AutomationBlock = {
    condition: 'state',
    entity_id: entityId,
    state: state
  };

  return JSON.stringify(yaml);
};

// Time Condition Generator
javascriptGenerator.forBlock['ha_time_condition'] = function(block: Block) {
  const startTime = block.getFieldValue('START_TIME');
  const endTime = block.getFieldValue('END_TIME');

  const yaml: AutomationBlock = {
    condition: 'time',
    after: startTime,
    before: endTime
  };

  return JSON.stringify(yaml);
};

// Call Service Generator
javascriptGenerator.forBlock['ha_call_service'] = function(block: Block) {
  const service = block.getFieldValue('SERVICE');
  const entityId = block.getFieldValue('ENTITY_ID');

  const yaml: AutomationBlock = {
    service,
    target: {
      entity_id: entityId
    }
  };

  return JSON.stringify(yaml);
};

// Set State Generator
javascriptGenerator.forBlock['ha_set_state'] = function(block: Block) {
  const entityId = block.getFieldValue('ENTITY_ID');
  const state = block.getFieldValue('STATE');

  const yaml: AutomationBlock = {
    service: 'homeassistant.set_state',
    data: {
      entity_id: entityId,
      state: state
    }
  };

  return JSON.stringify(yaml);
};

export const initBlockGenerators = () => {
  // Convert workspace to Home Assistant automation YAML
  return (workspace: Blockly.Workspace) => {
    const code = javascriptGenerator.workspaceToCode(workspace);
    try {
      // Handle empty workspace
      if (!code.trim()) {
        return {
          alias: 'Blockly Generated Automation',
          description: 'Automation generated using the visual editor',
          trigger: [],
          condition: [],
          action: []
        };
      }

      const blocks = code.split('\n')
        .filter(Boolean)
        .map((text: string) => {
          try {
            // Remove trailing semicolon if present
            const cleanText = text.replace(/;$/, '');
            return JSON.parse(cleanText) as AutomationBlock;
          } catch (error) {
            console.error('Failed to parse block:', text, error);
            return null;
          }
        })
        .filter((block): block is AutomationBlock => block !== null);

      // Basic Home Assistant automation structure
      const automation = {
        alias: 'Blockly Generated Automation',
        description: 'Automation generated using the visual editor',
        trigger: blocks.filter(b => b.platform),
        condition: blocks.filter(b => b.condition),
        action: blocks.filter(b => b.service)
      };

      return automation;
    } catch (error) {
      console.error('Failed to generate automation:', error);
      return null;
    }
  };
};
