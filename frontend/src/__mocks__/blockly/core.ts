const mockWorkspace = {
  dispose: jest.fn(),
  clear: jest.fn(),
  getVariableById: jest.fn(),
  createVariable: jest.fn(),
  getAllVariables: jest.fn(),
  addChangeListener: jest.fn(),
  updateToolbox: jest.fn(),
};

export const inject = jest.fn(() => mockWorkspace);
export const setLocale = jest.fn();
export const svgResize = jest.fn();
export const serialization = {
  workspaces: {
    save: jest.fn(),
    load: jest.fn(),
  },
};

export const registry = {
  register: jest.fn(),
  hasItem: jest.fn(),
};

export const Blocks = {};

export default {
  inject,
  setLocale,
  svgResize,
  serialization,
  registry,
  Blocks,
};
