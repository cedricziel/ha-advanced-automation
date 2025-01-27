import * as Blockly from 'blockly';
import { BlocklyPlugin, WorkspaceState } from '../../../types/blockly';

type MockFunction = jest.Mock;

// Mock Blockly workspace
export const createMockWorkspace = () => ({
  clear: jest.fn(),
  dispose: jest.fn(),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
  getAllVariables: jest.fn().mockReturnValue([]),
  createVariable: jest.fn(),
  getId: jest.fn().mockReturnValue('mock-workspace-id'),
}) as unknown as Blockly.Workspace;

// Mock plugin
export const createMockPlugin = (id: string = 'test-plugin'): BlocklyPlugin => ({
  id,
  init: jest.fn(),
  cleanup: jest.fn(),
  getState: jest.fn(),
  setState: jest.fn(),
});

// Mock workspace state
export const createMockWorkspaceState = (
  partial?: Partial<WorkspaceState>
): WorkspaceState => ({
  blocks: {
    blocks: [
      {
        type: 'test_block',
        id: 'test-block-1',
      },
    ],
  },
  variables: [
    {
      id: 'test-var-1',
      name: 'testVar',
      type: 'String',
    },
  ],
  ...partial,
});

// Mock toolbox configuration
export const createMockToolbox = () => ({
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Test Category',
      contents: [
        {
          kind: 'block',
          type: 'test_block',
        },
      ],
    },
  ],
});

// Mock Blockly namespace
export const mockBlockly = {
  inject: jest.fn().mockReturnValue(createMockWorkspace()),
  serialization: {
    workspaces: {
      save: jest.fn().mockReturnValue({}),
      load: jest.fn(),
    },
  },
  Workspace: jest.fn().mockImplementation(() => createMockWorkspace()),
} as unknown as typeof Blockly;

// Helper to wait for all pending promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock error for testing error scenarios
export class MockBlocklyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockBlocklyError';
  }
}

// Reset all mocks between tests
export const resetMocks = () => {
  jest.clearAllMocks();
  (mockBlockly.inject as MockFunction).mockReturnValue(createMockWorkspace());
  (mockBlockly.serialization.workspaces.save as MockFunction).mockReturnValue({});
  (mockBlockly.serialization.workspaces.load as MockFunction).mockImplementation();
};
