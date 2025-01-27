import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlocklyPluginProvider, useBlocklyPlugin } from '../BlocklyPluginProvider';
import { createMockPlugin, createMockWorkspace } from '../test-utils';
import * as Blockly from 'blockly';

describe('BlocklyPluginProvider', () => {
  const TestComponent: React.FC = () => {
    const { getPlugin, registerPlugin, unregisterPlugin } = useBlocklyPlugin();
    return (
      <div>
        <span data-testid="plugin-test">Plugin Provider Test</span>
      </div>
    );
  };

  it('provides plugin context to children', () => {
    render(
      <BlocklyPluginProvider plugins={[]}>
        <TestComponent />
      </BlocklyPluginProvider>
    );

    expect(screen.getByTestId('plugin-test')).toBeInTheDocument();
  });

  it('throws error when hook used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useBlocklyPlugin must be used within a BlocklyPluginProvider');

    consoleError.mockRestore();
  });

  it('initializes plugins in dependency order', () => {
    const initOrder: string[] = [];
    const plugin1 = createMockPlugin('plugin1');
    const plugin2 = createMockPlugin('plugin2');
    const plugin3 = createMockPlugin('plugin3');

    // Override init functions to track initialization order
    plugin1.init = jest.fn().mockImplementation(() => {
      initOrder.push('plugin1');
    });
    plugin2.init = jest.fn().mockImplementation(() => {
      initOrder.push('plugin2');
    });
    plugin3.init = jest.fn().mockImplementation(() => {
      initOrder.push('plugin3');
    });

    // Set up dependencies
    plugin2.dependencies = ['plugin1'];
    plugin3.dependencies = ['plugin2'];

    const workspace = createMockWorkspace();

    render(
      <BlocklyPluginProvider
        plugins={[plugin3, plugin1, plugin2]}
        workspace={workspace}
      >
        <TestComponent />
      </BlocklyPluginProvider>
    );

    // Verify initialization order
    expect(initOrder).toEqual(['plugin1', 'plugin2', 'plugin3']);
    expect(plugin1.init).toHaveBeenCalledWith(workspace);
    expect(plugin2.init).toHaveBeenCalledWith(workspace);
    expect(plugin3.init).toHaveBeenCalledWith(workspace);
  });

  it('cleans up plugins on unmount', () => {
    const plugin1 = createMockPlugin('plugin1');
    const plugin2 = createMockPlugin('plugin2');
    const workspace = createMockWorkspace();

    const { unmount } = render(
      <BlocklyPluginProvider
        plugins={[plugin1, plugin2]}
        workspace={workspace}
      >
        <TestComponent />
      </BlocklyPluginProvider>
    );

    unmount();

    expect(plugin1.cleanup).toHaveBeenCalled();
    expect(plugin2.cleanup).toHaveBeenCalled();
  });

  it('handles plugin registration and unregistration', () => {
    const TestComponentWithRegistration: React.FC = () => {
      const { registerPlugin, unregisterPlugin, getPlugin } = useBlocklyPlugin();

      React.useEffect(() => {
        const plugin = createMockPlugin('dynamic-plugin');
        registerPlugin(plugin);
        return () => unregisterPlugin('dynamic-plugin');
      }, [registerPlugin, unregisterPlugin]);

      return <div data-testid="registration-test" />;
    };

    const workspace = createMockWorkspace();

    const { unmount } = render(
      <BlocklyPluginProvider workspace={workspace}>
        <TestComponentWithRegistration />
      </BlocklyPluginProvider>
    );

    expect(screen.getByTestId('registration-test')).toBeInTheDocument();

    unmount();
  });

  it('handles plugin state management', () => {
    const plugin = createMockPlugin('stateful-plugin');
    const initialState = { value: 42 };
    const workspace = createMockWorkspace();

    plugin.getState = jest.fn().mockReturnValue(initialState);
    plugin.setState = jest.fn();

    render(
      <BlocklyPluginProvider
        plugins={[plugin]}
        workspace={workspace}
      >
        <TestComponent />
      </BlocklyPluginProvider>
    );

    expect(plugin.getState).toHaveBeenCalledWith(workspace);
    expect(plugin.init).toHaveBeenCalledWith(workspace);
  });

  it('warns about missing plugin dependencies', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const plugin = createMockPlugin('dependent-plugin');
    plugin.dependencies = ['missing-plugin'];
    const workspace = createMockWorkspace();

    render(
      <BlocklyPluginProvider
        plugins={[plugin]}
        workspace={workspace}
      >
        <TestComponent />
      </BlocklyPluginProvider>
    );

    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('depends on missing plugin missing-plugin')
    );

    consoleWarn.mockRestore();
  });

  it('prevents registering duplicate plugins', () => {
    const TestComponentWithDuplicateRegistration: React.FC = () => {
      const { registerPlugin } = useBlocklyPlugin();

      React.useEffect(() => {
        const plugin = createMockPlugin('duplicate-plugin');
        registerPlugin(plugin);
        expect(() => registerPlugin(plugin)).toThrow(
          'Plugin duplicate-plugin is already registered'
        );
      }, [registerPlugin]);

      return <div data-testid="duplicate-test" />;
    };

    const workspace = createMockWorkspace();

    render(
      <BlocklyPluginProvider workspace={workspace}>
        <TestComponentWithDuplicateRegistration />
      </BlocklyPluginProvider>
    );

    expect(screen.getByTestId('duplicate-test')).toBeInTheDocument();
  });
});
