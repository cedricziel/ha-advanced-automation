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

// Create and return the block extractor
export const initBlockGenerators = () => {
  return new HomeAssistantBlockExtractor();
};
