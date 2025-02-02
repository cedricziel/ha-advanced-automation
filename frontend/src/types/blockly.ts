import * as Blockly from 'blockly';

export interface BlocklyToolbox {
    kind: string;
    contents: (ToolboxCategory | ToolboxSeparator)[];
    blocks?: BlockDefinition[];
}

export interface ToolboxCategory {
    kind: 'category';
    name: string;
    categorystyle?: string;
    colour?: string;
    custom?: 'VARIABLE' | 'PROCEDURE';
    contents: (ToolboxBlock | ToolboxLabel)[];
}

export interface ToolboxSeparator {
    kind: 'sep';
}

export interface ToolboxLabel {
    kind: 'label';
    text: string;
    'web-class'?: string;
}

export interface ToolboxBlock {
    kind: 'block';
    type: string;
    disabled?: boolean;
    gap?: number;
    fields?: Record<string, any>;
    inputs?: Record<string, BlockInput>;
    mutation?: BlockMutation;
}

export interface BlockInput {
    shadow?: ToolboxBlock;
    block?: ToolboxBlock;
}

export interface BlockMutation {
    items?: number;
    [key: string]: any;
}

export interface BlockArgument {
    type: string;
    name: string;
    default?: string;
    options?: string[];
    alt?: Record<string, any>;
}

export interface BlockDefinition {
    type: string;
    message0: string;
    args0?: BlockArgument[];
    message1?: string;
    args1?: BlockArgument[];
    output?: string | string[];
    previousStatement?: boolean | string[];
    nextStatement?: boolean | string[];
    colour: number;
    tooltip?: string;
    helpUrl?: string;
    inputsInline?: boolean;
    extensions?: string[];
    mutator?: string;
}

// User-defined blocks API types
export interface UserBlockDefinition extends BlockDefinition {
    id: string;
    category: string;
    created: string;
    modified: string;
}

export interface CreateUserBlockRequest {
    definition: Omit<UserBlockDefinition, 'id' | 'created' | 'modified'>;
}

export interface UpdateUserBlockRequest {
    definition: Partial<Omit<UserBlockDefinition, 'id' | 'created' | 'modified'>>;
}

// Category styles
export interface CategoryStyle {
    colour: string;
}

export type CategoryStyles = {
    [key: string]: CategoryStyle;
}

// Standard category styles
export const STANDARD_CATEGORY_STYLES: CategoryStyles = {
    // Blockly standard categories
    logic_category: { colour: '#5b80a5' },
    loop_category: { colour: '#5ba55b' },
    math_category: { colour: '#5b67a5' },
    text_category: { colour: '#5ba58c' },
    list_category: { colour: '#745ba5' },
    colour_category: { colour: '#a5745b' },
    variable_category: { colour: '#a55b80' },
    procedure_category: { colour: '#995ba5' },
    // Home Assistant categories
    trigger_category: { colour: '#4a90e2' },  // Blue
    condition_category: { colour: '#7ed321' }, // Green
    action_category: { colour: '#f5a623' },   // Orange
    // User-defined blocks category
    user_category: { colour: '#bd10e0' }      // Purple
};

// Workspace state management
export interface WorkspaceState {
    blocks: any;
    variables: {
        id: string;
        name: string;
        type: string;
    }[];
    pluginStates?: Record<string, any>;
}

export interface BlocklyPlugin {
    id: string;
    init: (workspace: Blockly.Workspace) => void;
    cleanup?: () => void;
    dependencies?: string[];
    getState?: (workspace: Blockly.Workspace) => any;
    setState?: (workspace: Blockly.Workspace, state: any) => void;
}
