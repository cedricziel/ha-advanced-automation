import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as Blockly from 'blockly';
import { BlocklyWorkspace } from '../index';
import { WorkspaceState } from '../../../types/blockly';
import { createMockToolbox } from '../test-utils';

// Mock blockly module
jest.mock('blockly');

// Get the mocked functions with proper typing
const mockBlockly = jest.mocked(Blockly);

describe('BlocklyWorkspace', () => {
  let mockWorkspace: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock workspace for each test
    mockWorkspace = {
      clear: jest.fn(),
      dispose: jest.fn(),
      addChangeListener: jest.fn((fn) => fn),
      removeChangeListener: jest.fn(),
      getAllVariables: jest.fn().mockReturnValue([]),
      createVariable: jest.fn(),
      getId: jest.fn().mockReturnValue('mock-workspace-id'),
    };

    // Setup mock implementations
    mockBlockly.inject.mockReturnValue(mockWorkspace);
    mockBlockly.serialization = {
      workspaces: {
        save: jest.fn().mockReturnValue({}),
        load: jest.fn(),
      },
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with data-testid', () => {
    render(
      <div data-testid="blockly-container">
        <BlocklyWorkspace
          toolbox={createMockToolbox()}
        />
      </div>
    );

    expect(screen.getByTestId('blockly-container')).toBeInTheDocument();
  });

  it('initializes Blockly workspace with correct configuration', () => {
    const toolbox = createMockToolbox();
    const theme = { name: 'test-theme' } as Blockly.Theme;
    const workspaceConfiguration = {
      grid: { spacing: 30, length: 5 },
      zoom: { controls: true, wheel: true, startScale: 1.0 },
    };

    render(
      <BlocklyWorkspace
        toolbox={toolbox}
        theme={theme}
        workspaceConfiguration={workspaceConfiguration}
      />
    );

    expect(mockBlockly.inject).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        toolbox,
        theme,
        grid: expect.objectContaining({
          spacing: 30,
          length: 5,
        }),
        zoom: expect.objectContaining({
          controls: true,
          wheel: true,
          startScale: 1.0,
        }),
      })
    );
  });

  it('loads initial state correctly', async () => {
    const initialState: WorkspaceState = {
      blocks: { blocks: [{ type: 'test_block', id: 'test-1' }] },
      variables: [{ id: 'var-1', name: 'testVar', type: 'String' }],
    };

    render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        initialState={initialState}
      />
    );

    // Wait for initialization
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockWorkspace.clear).toHaveBeenCalled();
    expect(mockBlockly.serialization.workspaces.load).toHaveBeenCalledWith(
      initialState.blocks,
      mockWorkspace
    );

    initialState.variables?.forEach(variable => {
      expect(mockWorkspace.createVariable).toHaveBeenCalledWith(
        variable.name,
        variable.type,
        variable.id
      );
    });
  });

  it('handles controlled state updates', async () => {
    const initialState: WorkspaceState = {
      blocks: { blocks: [{ type: 'test_block', id: 'test-1' }] },
      variables: [],
    };
    const updatedState: WorkspaceState = {
      blocks: { blocks: [{ type: 'updated_block', id: 'block-2' }] },
      variables: [],
    };

    const { rerender } = render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        value={initialState}
      />
    );

    // Wait for initialization
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockBlockly.serialization.workspaces.load).toHaveBeenCalledWith(
      initialState.blocks,
      mockWorkspace
    );

    rerender(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        value={updatedState}
      />
    );

    expect(mockWorkspace.clear).toHaveBeenCalled();
    expect(mockBlockly.serialization.workspaces.load).toHaveBeenCalledWith(
      updatedState.blocks,
      mockWorkspace
    );
  });

  it('calls onChange when workspace changes', async () => {
    const handleChange = jest.fn();
    const savedState = { blocks: [{ id: 'test' }] };
    mockBlockly.serialization.workspaces.save.mockReturnValue(savedState);

    render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        onChange={handleChange}
      />
    );

    // Wait for initialization
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate workspace change
    const changeEvent = { type: 'change' } as Blockly.Events.Abstract;
    const changeListener = mockWorkspace.addChangeListener.mock.calls[0][0];
    act(() => {
      changeListener(changeEvent);
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: savedState,
        variables: expect.any(Array),
      })
    );
  });

  it('calls onError when initialization fails', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const handleError = jest.fn();
    const error = new Error('Initialization failed');
    mockBlockly.inject.mockImplementationOnce(() => {
      throw error;
    });

    render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        onError={handleError}
      />
    );

    expect(handleError).toHaveBeenCalledWith(error);
    expect(consoleError).toHaveBeenCalledWith(
      'Error initializing workspace:',
      error
    );

    consoleError.mockRestore();
  });

  it('cleans up workspace on unmount', () => {
    const { unmount } = render(
      <BlocklyWorkspace toolbox={createMockToolbox()} />
    );

    unmount();

    expect(mockWorkspace.dispose).toHaveBeenCalled();
  });

  it('handles auto-save interval', () => {
    jest.useFakeTimers();
    const handleChange = jest.fn();
    const savedState = { blocks: [{ id: 'test' }] };
    mockBlockly.serialization.workspaces.save.mockReturnValue(savedState);

    render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        onChange={handleChange}
        autoSaveInterval={1000}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: savedState,
        variables: expect.any(Array),
      })
    );
  });

  it('disables auto-save when interval is 0', () => {
    jest.useFakeTimers();
    const handleChange = jest.fn();
    mockBlockly.serialization.workspaces.save.mockReturnValue({});

    render(
      <BlocklyWorkspace
        toolbox={createMockToolbox()}
        onChange={handleChange}
        autoSaveInterval={0}
      />
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles read-only mode', () => {
    const toolbox = createMockToolbox();

    render(
      <BlocklyWorkspace
        toolbox={toolbox}
        readOnly={true}
      />
    );

    const lastCall = mockBlockly.inject.mock.calls[mockBlockly.inject.mock.calls.length - 1];
    expect(lastCall[1]).toEqual({
      readOnly: true,
      toolbox,
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
      trashcan: true,
      theme: undefined,
    });
  });
});
