import * as Blockly from 'blockly/core';

/**
 * Custom field for Home Assistant entity IDs
 */
export class FieldEntity extends Blockly.FieldTextInput {
  /**
   * Class constructor for the entity field.
   * @param {string=} value The initial value of the field. Should be a valid entity ID.
   * @param {Function=} validator A function that is called to validate changes to the field's value.
   * @param {Object=} config A map of options used to configure the field.
   */
  constructor(value?: string, validator?: Blockly.FieldTextInputValidator, config?: Object) {
    super(value || '', validator);
  }

  /**
   * Constructs a FieldEntity from a JSON arg object.
   * @param {!Object} options A JSON object with options.
   * @returns {!FieldEntity} The new field instance.
   * @package
   * @nocollapse
   */
  static fromJson(options: any): FieldEntity {
    return new FieldEntity(options['value']);
  }

  /**
   * Validates the entity ID format.
   * @param {string} newValue The value to be validated.
   * @returns {string|null} The validated value (a string) or null if invalid.
   * @protected
   */
  protected doClassValidation_(newValue: string): string | null {
    // Trim whitespace
    newValue = newValue.trim();

    // Don't allow empty values
    if (!newValue) {
      return null;
    }

    // Basic entity ID format validation (domain.entity)
    if (!newValue.includes('.')) {
      return null;
    }

    // Split into domain and entity_id
    const [domain, ...rest] = newValue.split('.');

    // Validate domain exists and entity_id is present
    if (!domain || rest.length === 0) {
      return null;
    }

    // Validate no spaces in entity ID
    if (newValue.includes(' ')) {
      return null;
    }

    return newValue;
  }
}

// Register the field with Blockly
Blockly.fieldRegistry.register('field_entity', FieldEntity);
