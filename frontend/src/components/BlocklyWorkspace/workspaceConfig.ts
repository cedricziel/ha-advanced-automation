import * as Blockly from 'blockly';
import { STANDARD_CATEGORY_STYLES } from '../../types/blockly';

// Create a theme that includes our category styles
const defaultTheme = Blockly.Theme.defineTheme('default', {
  name: 'default',
  base: Blockly.Themes.Classic,
  categoryStyles: STANDARD_CATEGORY_STYLES,
  blockStyles: {},
  componentStyles: {},
  fontStyle: {},
  startHats: false
});

export interface WorkspaceConfigOptions {
  readOnly?: boolean;
  theme?: Blockly.Theme;
  grid?: {
    spacing?: number;
    length?: number;
    colour?: string;
    snap?: boolean;
  };
  zoom?: {
    controls?: boolean;
    wheel?: boolean;
    startScale?: number;
    maxScale?: number;
    minScale?: number;
    scaleSpeed?: number;
  };
  move?: {
    scrollbars?: boolean;
    drag?: boolean;
    wheel?: boolean;
  };
  trashcan?: boolean;
}

export const createWorkspaceConfig = (
  toolbox: any,
  options: WorkspaceConfigOptions = {}
) => {
  const defaultConfig = {
    toolbox,
    theme: options.theme || defaultTheme,
    readOnly: false,
    trashcan: true,
    grid: {
      spacing: 20,
      length: 3,
      colour: '#ccc',
      snap: true,
    },
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
  };

  // Handle readOnly separately to ensure it's not overridden by spreading defaultConfig
  const readOnly = options.readOnly ?? defaultConfig.readOnly;

  return {
    ...defaultConfig,
    ...options,
    readOnly,
    grid: options.grid ? { ...defaultConfig.grid, ...options.grid } : defaultConfig.grid,
    move: options.move ? { ...defaultConfig.move, ...options.move } : defaultConfig.move,
    zoom: options.zoom ? { ...defaultConfig.zoom, ...options.zoom } : defaultConfig.zoom,
  };
};
