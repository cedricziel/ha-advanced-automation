import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import { BlocklyPlugin } from '../../types/blockly';

interface BlocklyPluginContextType {
  registerPlugin: (plugin: BlocklyPlugin) => void;
  unregisterPlugin: (pluginId: string) => void;
  getPlugin: (pluginId: string) => BlocklyPlugin | undefined;
  getPluginState: (pluginId: string) => any;
}

const BlocklyPluginContext = createContext<BlocklyPluginContextType | null>(null);

export const useBlocklyPlugin = () => {
  const context = useContext(BlocklyPluginContext);
  if (!context) {
    throw new Error('useBlocklyPlugin must be used within a BlocklyPluginProvider');
  }
  return context;
};

interface BlocklyPluginProviderProps {
  children: React.ReactNode;
  plugins?: BlocklyPlugin[];
  workspace?: Blockly.Workspace | null;
}

export const BlocklyPluginProvider: React.FC<BlocklyPluginProviderProps> = ({
  children,
  plugins = [],
  workspace,
}) => {
  const pluginsRef = useRef<Map<string, BlocklyPlugin>>(new Map());
  const pluginStatesRef = useRef<Map<string, any>>(new Map());

    // Initialize plugins when workspace is available
  // We're safely capturing ref values in the cleanup function
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!workspace) return;

    // Capture ref values at the start of the effect
    const pluginsMap = pluginsRef.current;
    const pluginStatesMap = pluginStatesRef.current;

    // Sort plugins by dependencies
    const sortedPlugins = sortPluginsByDependencies(plugins);

    // Initialize plugins
    sortedPlugins.forEach(plugin => {
      try {
        plugin.init(workspace);
        pluginsMap.set(plugin.id, plugin);

        // Initialize plugin state if available
        if (plugin.getState) {
          const state = plugin.getState(workspace);
          pluginStatesMap.set(plugin.id, state);
        }
      } catch (error) {
        console.error(`Failed to initialize plugin ${plugin.id}:`, error);
      }
    });

    // Create cleanup function with captured refs
    const cleanupPlugins = (plugins: Map<string, BlocklyPlugin>, states: Map<string, any>) => {
      Array.from(plugins.values()).forEach(plugin => {
        try {
          if (plugin.cleanup) {
            plugin.cleanup();
          }
        } catch (error) {
          console.error(`Failed to cleanup plugin ${plugin.id}:`, error);
        }
      });
      plugins.clear();
      states.clear();
    };

    // Return cleanup function with captured refs
    return () => cleanupPlugins(pluginsMap, pluginStatesMap);
  }, [workspace, plugins]);

  const sortPluginsByDependencies = (plugins: BlocklyPlugin[]): BlocklyPlugin[] => {
    const visited = new Set<string>();
    const sorted: BlocklyPlugin[] = [];

    const visit = (plugin: BlocklyPlugin) => {
      if (visited.has(plugin.id)) return;
      visited.add(plugin.id);

      // Visit dependencies first
      if (plugin.dependencies) {
        plugin.dependencies.forEach(depId => {
          const depPlugin = plugins.find(p => p.id === depId);
          if (depPlugin) {
            visit(depPlugin);
          } else {
            console.warn(`Plugin ${plugin.id} depends on missing plugin ${depId}`);
          }
        });
      }

      sorted.push(plugin);
    };

    plugins.forEach(visit);
    return sorted;
  };

  const value: BlocklyPluginContextType = {
    registerPlugin: (plugin: BlocklyPlugin) => {
      if (!workspace) {
        throw new Error('Cannot register plugin: workspace not available');
      }
      const pluginsMap = pluginsRef.current;
      const pluginStatesMap = pluginStatesRef.current;

      if (pluginsMap.has(plugin.id)) {
        throw new Error(`Plugin ${plugin.id} is already registered`);
      }
      plugin.init(workspace);
      pluginsMap.set(plugin.id, plugin);
      if (plugin.getState) {
        pluginStatesMap.set(plugin.id, plugin.getState(workspace));
      }
    },

    unregisterPlugin: (pluginId: string) => {
      const pluginsMap = pluginsRef.current;
      const pluginStatesMap = pluginStatesRef.current;
      const plugin = pluginsMap.get(pluginId);

      if (plugin?.cleanup) {
        plugin.cleanup();
      }
      pluginsMap.delete(pluginId);
      pluginStatesMap.delete(pluginId);
    },

    getPlugin: (pluginId: string) => {
      const pluginsMap = pluginsRef.current;
      return pluginsMap.get(pluginId);
    },

    getPluginState: (pluginId: string) => {
      const pluginStatesMap = pluginStatesRef.current;
      return pluginStatesMap.get(pluginId);
    },
  };

  return (
    <BlocklyPluginContext.Provider value={value}>
      {children}
    </BlocklyPluginContext.Provider>
  );
};
