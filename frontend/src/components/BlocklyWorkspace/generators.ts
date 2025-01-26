import * as Blockly from 'blockly';
import { TriggerDefinition, ConditionDefinition } from '../../types/automation';

export interface BlockExtractor {
  extractTriggers(workspace: Blockly.Workspace): TriggerDefinition[];
  extractConditions(workspace: Blockly.Workspace): ConditionDefinition[];
}

class HomeAssistantBlockExtractor implements BlockExtractor {
  extractTriggers(workspace: Blockly.Workspace): TriggerDefinition[] {
    const triggers: TriggerDefinition[] = [];

    // Get state triggers
    const stateTriggers = workspace.getBlocksByType('ha_state_trigger', false);
    stateTriggers.forEach(block => {
      triggers.push({
        type: 'state',
        config: {
          entity_id: block.getFieldValue('ENTITY_ID'),
          to: block.getFieldValue('STATE')
        }
      });
    });

    // Get time triggers
    const timeTriggers = workspace.getBlocksByType('ha_time_trigger', false);
    timeTriggers.forEach(block => {
      triggers.push({
        type: 'time',
        config: {
          at: block.getFieldValue('TIME')
        }
      });
    });

    return triggers;
  }

  extractConditions(workspace: Blockly.Workspace): ConditionDefinition[] {
    const conditions: ConditionDefinition[] = [];

    // Get state conditions
    const stateConditions = workspace.getBlocksByType('ha_state_condition', false);
    stateConditions.forEach(block => {
      conditions.push({
        type: 'state',
        config: {
          entity_id: block.getFieldValue('ENTITY_ID'),
          state: block.getFieldValue('STATE')
        }
      });
    });

    // Get time conditions
    const timeConditions = workspace.getBlocksByType('ha_time_condition', false);
    timeConditions.forEach(block => {
      conditions.push({
        type: 'time',
        config: {
          after: block.getFieldValue('START_TIME'),
          before: block.getFieldValue('END_TIME')
        }
      });
    });

    return conditions;
  }
}

// Initialize block definitions
export function initBlockDefinitions() {
  // State Trigger
  Blockly.Blocks['ha_state_trigger'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("When entity")
          .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID")
          .appendField("changes to")
          .appendField(new Blockly.FieldTextInput("state"), "STATE");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("Triggers when an entity changes to a specific state");
      this.setHelpUrl("");
    }
  };

  // Time Trigger
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

  // State Condition
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

  // Time Condition
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

  // Call Service
  Blockly.Blocks['ha_call_service'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Call service")
          .appendField(new Blockly.FieldTextInput("domain.service"), "SERVICE")
          .appendField("with entity")
          .appendField(new Blockly.FieldTextInput("entity.id"), "ENTITY_ID");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(60);
      this.setTooltip("Call a Home Assistant service");
      this.setHelpUrl("");
    }
  };

  // Set State
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
}

// Create and return the block extractor
export const initBlockGenerators = () => {
  initBlockDefinitions();
  return new HomeAssistantBlockExtractor();
};
