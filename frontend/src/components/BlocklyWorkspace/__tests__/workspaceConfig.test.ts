import { createWorkspaceConfig } from '../workspaceConfig';
import { createMockToolbox } from '../test-utils';
import * as Blockly from 'blockly';

describe('workspaceConfig', () => {
  it('creates config with defaults', () => {
    const toolbox = createMockToolbox();
    const config = createWorkspaceConfig(toolbox);

    expect(config).toEqual({
      toolbox,
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
    });
  });

  it('merges custom options with defaults', () => {
    const toolbox = createMockToolbox();
    const customTheme = { name: 'custom' } as Blockly.Theme;
    const config = createWorkspaceConfig(toolbox, {
      readOnly: true,
      theme: customTheme,
      grid: {
        spacing: 30,
        snap: false,
      },
      zoom: {
        wheel: false,
        startScale: 0.8,
      },
    });

    expect(config).toEqual({
      toolbox,
      readOnly: true,
      theme: customTheme,
      trashcan: true,
      grid: {
        spacing: 30,
        length: 3,
        colour: '#ccc',
        snap: false,
      },
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      zoom: {
        controls: true,
        wheel: false,
        startScale: 0.8,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });
  });

  it('handles undefined optional configurations', () => {
    const toolbox = createMockToolbox();
    const config = createWorkspaceConfig(toolbox, {
      readOnly: true,
    });

    expect(config.grid).toEqual({
      spacing: 20,
      length: 3,
      colour: '#ccc',
      snap: true,
    });
    expect(config.move).toEqual({
      scrollbars: true,
      drag: true,
      wheel: true,
    });
    expect(config.zoom).toEqual({
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    });
  });

  it('preserves all grid options when partially specified', () => {
    const toolbox = createMockToolbox();
    const config = createWorkspaceConfig(toolbox, {
      grid: {
        spacing: 40,
      },
    });

    expect(config.grid).toEqual({
      spacing: 40,
      length: 3,
      colour: '#ccc',
      snap: true,
    });
  });

  it('preserves all zoom options when partially specified', () => {
    const toolbox = createMockToolbox();
    const config = createWorkspaceConfig(toolbox, {
      zoom: {
        startScale: 0.5,
      },
    });

    expect(config.zoom).toEqual({
      controls: true,
      wheel: true,
      startScale: 0.5,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    });
  });

  it('preserves all move options when partially specified', () => {
    const toolbox = createMockToolbox();
    const config = createWorkspaceConfig(toolbox, {
      move: {
        wheel: false,
      },
    });

    expect(config.move).toEqual({
      scrollbars: true,
      drag: true,
      wheel: false,
    });
  });
});
