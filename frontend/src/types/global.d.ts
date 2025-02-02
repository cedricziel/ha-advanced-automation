import * as Blockly from 'blockly';

declare global {
  interface Window {
    Blockly: typeof Blockly & {
      serialization: {
        workspaces: {
          save: (workspace: Blockly.Workspace) => any;
          load: (state: any, workspace: Blockly.Workspace) => void;
        };
      };
      Blocks: Record<string, {
        init: () => void;
      }>;
      inject: (
        container: HTMLElement,
        options?: Blockly.BlocklyOptions
      ) => Blockly.WorkspaceSvg;
      svgResize: (workspace: Blockly.WorkspaceSvg) => void;
    };
  }
}
