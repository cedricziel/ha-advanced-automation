import '@testing-library/jest-dom';

// Mock setImmediate for our flushPromises utility
(global as any).setImmediate = (callback: Function) => setTimeout(callback, 0);
