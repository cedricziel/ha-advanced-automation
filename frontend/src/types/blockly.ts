export interface BlocklyToolbox {
    kind: string;
    contents: ToolboxCategory[];
}

export interface ToolboxCategory {
    kind: string;
    name: string;
    colour: string;
    contents: ToolboxBlock[];
}

export interface ToolboxBlock {
    kind: string;
    type: string;
}

export interface BlockArgument {
    type: string;
    name: string;
    default: string;
}

export interface BlockDefinition {
    type: string;
    message0: string;
    args0: BlockArgument[];
    output?: string;
    previousStatement?: boolean;
    nextStatement?: boolean;
    colour: number;
    tooltip: string;
    helpUrl?: string;
}
