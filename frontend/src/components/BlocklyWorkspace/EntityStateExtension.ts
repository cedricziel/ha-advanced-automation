import * as Blockly from 'blockly';

interface BlocklyField {
  getSourceBlock(): any;
  setValue(value: string): void;
}

export function registerEntityStateExtension() {
  // Register an extension that adds validation for entity states
  Blockly.Extensions.register('entity_state_extension', function(this: any) {
    // Add validation for state fields
    const stateField = this.getField('STATE') as BlocklyField;
    if (stateField) {
      stateField.setValue = function(value: string) {
        // You could add state validation logic here
        // For example, checking if it's a valid state for the selected entity
        return value;
      };
    }

    // Add validation for entity fields
    const entityField = this.getField('ENTITY_ID') as BlocklyField;
    if (entityField) {
      entityField.setValue = function(value: string) {
        // You could add entity validation logic here
        // For example, checking if it's a valid entity ID format
        return value.toLowerCase();
      };
    }
  });
}
