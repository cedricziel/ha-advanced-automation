import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlocklyEditor from '../index';
import { BlocklyToolbox, WorkspaceState } from '../../../types/blockly';

// Mock Blockly
const mockInject = jest.fn();
const mockSerializationSave = jest.fn();
const mockSerializationLoad = jest.fn();
const mockSvgResize = jest.fn();
const mockWorkspaceDispose = jest.fn();
const mockWorkspaceClear = jest.fn();
const mockWorkspaceGetVariableById = jest.fn();
const mockWorkspaceCreateVariable = jest.fn();
const mockWorkspaceGetAllVariables = jest.fn();
const mockWorkspaceAddChangeListener = jest.fn();
const mockRegistryRegister = jest.fn();
const mockRegistryHasItem = jest.fn();

// Mock the Blockly global object
const mockBlockly = {
  inject: mockInject,
  serialization: {
    workspaces: {
      save: mockSerializationSave,
      load: mockSerializationLoad,
    },
  },
  svgResize: mockSvgResize,
  Blocks: {},
  registry: {
    register: mockRegistryRegister,
    hasItem: mockRegistryHasItem,
  },
};

// Mock workspace instance
const mockWorkspace = {
  dispose: mockWorkspaceDispose,
  clear: mockWorkspaceClear,
  getVariableById: mockWorkspaceGetVariableById,
  createVariable: mockWorkspaceCreateVariable,
  getAllVariables: mockWorkspaceGetAllVariables,
  addChangeListener: mockWorkspaceAddChangeListener,
  updateToolbox: jest.fn(),
};

// Setup global mocks
beforeAll(() => {
  // @ts-ignore - mocking global Blockly
  window.Blockly = mockBlockly;
  mockInject.mockReturnValue(mockWorkspace);
});

// Mock required modules
jest.mock('@blockly/field-multilineinput', () => ({
  registerFieldMultilineInput: jest.fn(),
}));

jest.mock('@blockly/continuous-toolbox', () => ({
  ContinuousToolbox: jest.fn(),
  ContinuousFlyout: jest.fn(),
  ContinuousMetrics: jest.fn(),
}));

const mockToolbox: BlocklyToolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category' as const,
      name: 'Test Category',
      contents: [],
    },
  ],
  blocks: [],
};

const mockWorkspaceState: WorkspaceState = {
  blocks: {
    blocks: [
      {
        type: 'test_block',
        id: '1',
      },
    ],
  },
  variables: [
    {
      id: 'var1',
      name: 'testVar',
      type: 'String',
    },
  ],
};

describe('BlocklyEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistryHasItem.mockReturnValue(false);
  });

  it('renders loading state initially', () => {
    render(<BlocklyEditor toolbox={mockToolbox} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('initializes Blockly workspace with provided toolbox', async () => {
    render(<BlocklyEditor toolbox={mockToolbox} />);

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    const injectConfig = mockInject.mock.calls[0][1];
    expect(injectConfig.toolbox).toBe(mockToolbox);
    expect(injectConfig.readOnly).toBeFalsy();
  });

  it('loads initial workspace state when provided', async () => {
    render(
      <BlocklyEditor
        toolbox={mockToolbox}
        initialState={mockWorkspaceState}
      />
    );

    await waitFor(() => {
      expect(mockSerializationLoad).toHaveBeenCalledWith(
        mockWorkspaceState.blocks,
        mockWorkspace
      );
    });

    expect(mockWorkspaceCreateVariable).toHaveBeenCalledWith(
      'testVar',
      'String',
      'var1'
    );
  });

  it('handles workspace errors', async () => {
    mockInject.mockImplementationOnce(() => {
      throw new Error('Workspace error');
    });

    render(<BlocklyEditor toolbox={mockToolbox} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Workspace error/)).toBeInTheDocument();
    });
  });

  it('handles read-only mode', async () => {
    render(<BlocklyEditor toolbox={mockToolbox} readOnly={true} />);

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    const injectConfig = mockInject.mock.calls[0][1];
    expect(injectConfig.readOnly).toBeTruthy();
  });

  it('gets workspace state correctly', async () => {
    mockSerializationSave.mockReturnValue({ blocks: [] });
    mockWorkspaceGetAllVariables.mockReturnValue([
      { getId: () => '1', name: 'var1', type: 'String' },
    ]);

    const { container } = render(<BlocklyEditor toolbox={mockToolbox} />);

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    // Get the component instance
    const editor = container.firstChild as any;
    const state = editor.getWorkspaceState();

    expect(state).toEqual({
      blocks: { blocks: [] },
      variables: [{ id: '1', name: 'var1', type: 'String' }],
    });
  });

  it('cleans up resources on unmount', async () => {
    const { unmount } = render(<BlocklyEditor toolbox={mockToolbox} />);

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    unmount();
    expect(mockWorkspaceDispose).toHaveBeenCalled();
  });

  it('updates toolbox when props change', async () => {
    const { rerender } = render(<BlocklyEditor toolbox={mockToolbox} />);

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    const newToolbox: BlocklyToolbox = {
      ...mockToolbox,
      contents: [
        {
          kind: 'category' as const,
          name: 'New Category',
          contents: [],
        },
      ],
    };

    rerender(<BlocklyEditor toolbox={newToolbox} />);

    expect(mockWorkspace.updateToolbox).toHaveBeenCalledWith(newToolbox);
  });

  it('handles error callback', async () => {
    const onError = jest.fn();
    mockSerializationSave.mockImplementationOnce(() => {
      throw new Error('Save error');
    });

    const { container } = render(
      <BlocklyEditor toolbox={mockToolbox} onError={onError} />
    );

    await waitFor(() => {
      expect(mockInject).toHaveBeenCalled();
    });

    // Get the component instance
    const editor = container.firstChild as any;
    editor.getWorkspaceState();

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
