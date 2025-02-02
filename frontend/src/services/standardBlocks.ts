import { ToolboxCategory, BlockDefinition } from '../types/blockly';

// Convert the standard blocks XML to our TypeScript structure
export const standardBlocks = {
  categories: [
    {
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_null', disabled: true },
        { kind: 'block', type: 'logic_ternary' }
      ]
    },
    {
      kind: 'category',
      name: 'Loops',
      categorystyle: 'loop_category',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: {
            TIMES: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '10' }
              }
            }
          }
        },
        { kind: 'block', type: 'controls_whileUntil' },
        {
          kind: 'block',
          type: 'controls_for',
          inputs: {
            FROM: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '1' }
              }
            },
            TO: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '10' }
              }
            },
            BY: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '1' }
              }
            }
          }
        },
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_flow_statements' }
      ]
    },
    {
      kind: 'category',
      name: 'Math',
      categorystyle: 'math_category',
      contents: [
        {
          kind: 'block',
          type: 'math_number',
          fields: { NUM: '123' }
        },
        {
          kind: 'block',
          type: 'math_arithmetic',
          inputs: {
            A: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '1' }
              }
            },
            B: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '1' }
              }
            }
          }
        },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_constant' },
        {
          kind: 'block',
          type: 'math_number_property',
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '0' }
              }
            }
          }
        },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_on_list' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_constrain' },
        { kind: 'block', type: 'math_random_int' },
        { kind: 'block', type: 'math_random_float' }
      ]
    },
    {
      kind: 'category',
      name: 'Text',
      categorystyle: 'text_category',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_multiline' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_append' },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_isEmpty' },
        { kind: 'block', type: 'text_indexOf' },
        { kind: 'block', type: 'text_charAt' },
        { kind: 'block', type: 'text_getSubstring' },
        { kind: 'block', type: 'text_changeCase' },
        { kind: 'block', type: 'text_trim' },
        { kind: 'block', type: 'text_print' },
        { kind: 'block', type: 'text_prompt_ext' }
      ]
    },
    {
      kind: 'category',
      name: 'Lists',
      categorystyle: 'list_category',
      contents: [
        {
          kind: 'block',
          type: 'lists_create_with',
          mutation: { items: 0 }
        },
        { kind: 'block', type: 'lists_create_with' },
        {
          kind: 'block',
          type: 'lists_repeat',
          inputs: {
            NUM: {
              shadow: {
                kind: 'block',
                type: 'math_number',
                fields: { NUM: '5' }
              }
            }
          }
        },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
        { kind: 'block', type: 'lists_getSublist' },
        { kind: 'block', type: 'lists_sort' },
        { kind: 'block', type: 'lists_reverse' }
      ]
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE'
    },
    {
      kind: 'category',
      name: 'Functions',
      categorystyle: 'procedure_category',
      custom: 'PROCEDURE'
    }
  ] as ToolboxCategory[],

  // Define only custom blocks here, not standard Blockly blocks
  definitions: [] as BlockDefinition[]
};
