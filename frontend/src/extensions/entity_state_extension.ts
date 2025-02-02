import * as Blockly from 'blockly/core';

/**
 * Extension to validate entity states in Home Assistant blocks
 */
const entityStateExtension = function(this: Blockly.Block) {
  // Add validation for the STATE field
  const stateField = this.getField('STATE');
  if (stateField && stateField instanceof Blockly.FieldTextInput) {
    stateField.setValidator(function(newValue: string) {
      // Trim whitespace
      newValue = newValue.trim();

      // Don't allow empty states
      if (!newValue) {
        return null;
      }

      return newValue;
    });
  }

  // Add validation for the ENTITY_ID field if it exists
  const entityField = this.getField('ENTITY_ID');
  if (entityField && entityField instanceof Blockly.FieldTextInput) {
    entityField.setValidator(function(newValue: string) {
      // Trim whitespace
      newValue = newValue.trim();

      // Basic entity ID format validation (domain.entity)
      if (!newValue.includes('.')) {
        return null;
      }

      return newValue;
    });
  }
};

// Register the extension
Blockly.Extensions.register('entity_state_extension', entityStateExtension);
