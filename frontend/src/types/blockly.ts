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
