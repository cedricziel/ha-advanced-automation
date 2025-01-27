export const mockWorkspace = {
  clear: jest.fn(),
  dispose: jest.fn(),
  addChangeListener: jest.fn((fn) => fn),
  removeChangeListener: jest.fn(),
  getAllVariables: jest.fn().mockReturnValue([]),
  createVariable: jest.fn(),
  getId: jest.fn().mockReturnValue('mock-workspace-id'),
  resizeHandlerWrapper: jest.fn(),
  rendered: true,
  visible: true,
  resizesEnabled: true,
  RTL: false,
  horizontalLayout: false,
  toolboxPosition: 0,
  getWidth: jest.fn().mockReturnValue(1024),
  getHeight: jest.fn().mockReturnValue(768),
  addTopBlock: jest.fn(),
  removeTopBlock: jest.fn(),
  getTopBlocks: jest.fn().mockReturnValue([]),
  addTypedBlock: jest.fn(),
  getBlockById: jest.fn(),
  getAllBlocks: jest.fn().mockReturnValue([]),
  scale: 1,
  scrollX: 0,
  scrollY: 0,
  workspace: null,
};

export const mockSerialization = {
  workspaces: {
    save: jest.fn().mockReturnValue({}),
    load: jest.fn(),
  },
};

export const inject = jest.fn().mockReturnValue(mockWorkspace);
export const WorkspaceSvg = jest.fn().mockImplementation(() => mockWorkspace);
