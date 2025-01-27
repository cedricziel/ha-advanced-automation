import React, { useRef, useEffect, useState, memo } from 'react';
import * as Blockly from 'blockly';
import './BlocklyWorkspace.css';
import { BlocklyPlugin, WorkspaceState, ToolboxCategory, ToolboxBlock, BlocklyToolbox, BlockDefinition, STANDARD_CATEGORY_STYLES } from '../../types/blockly';
import { WorkspaceChangeData } from '../../types/automation';
import { BlocklyPluginProvider } from './BlocklyPluginProvider';
import { createWorkspaceConfig, WorkspaceConfigOptions } from './workspaceConfig';

interface BlocklyWorkspaceProps {
  // Core props
  initialState?: WorkspaceState;
  value?: WorkspaceState;
  onChange?: (state: WorkspaceState) => void;
  onError?: (error: Error) => void;
  onWorkspaceChange?: (data: WorkspaceChangeData) => void;

  // Configuration
  workspaceConfiguration?: WorkspaceConfigOptions;
  toolbox?: BlocklyToolbox;
  theme?: Blockly.Theme;
  readOnly?: boolean;

  // Plugin support
  plugins?: BlocklyPlugin[];

  // Auto-save
  autoSaveInterval?: number;

  // Children for extensibility
  children?: React.ReactNode;
}

const BlocklyWorkspaceCore: React.FC<BlocklyWorkspaceProps> = memo(({
  initialState,
  value,
  onChange,
  onError,
  onWorkspaceChange,
  workspaceConfiguration = {},
  toolbox,
  theme,
  readOnly = false,
  autoSaveInterval = 0,
  children
}) => {
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Workspace initialization
  useEffect(() => {
    if (!containerRef.current || !toolbox) return;

    try {
      // Register category styles with Blockly
      Object.entries(STANDARD_CATEGORY_STYLES).forEach(([name, style]) => {
        if (!Blockly.registry.hasItem('categoryStyle', name)) {
          Blockly.registry.register('categoryStyle', name, style);
        }
      });

      // Register block definitions from toolbox
      (toolbox.contents as ToolboxCategory[]).forEach((category) => {
        if (category.kind === 'category' && category.contents) {
          category.contents.forEach((item) => {
            if (item.kind === 'block' && 'type' in item) {
              // Get block definition from backend response
              const blockDef = toolbox.blocks?.find((block: BlockDefinition) => block.type === item.type);
              if (blockDef && !Blockly.Blocks[item.type]) {
                Blockly.Blocks[item.type] = {
                  init: function() {
                    this.jsonInit(blockDef);
                  }
                };
              }
            }
          });
        }
      });

      const config = createWorkspaceConfig(toolbox, {
        ...workspaceConfiguration,
        readOnly,
        theme,
      });

      const workspace = Blockly.inject(containerRef.current, config);
      workspaceRef.current = workspace;
      setIsInitialized(true);

      // Load initial state
      if (initialState && !value) {
        try {
          if (workspace) {
            workspace.clear();
            Blockly.serialization.workspaces.load(initialState.blocks, workspace);

            // Load variables if they exist and are iterable
            if (initialState.variables && Array.isArray(initialState.variables)) {
              initialState.variables.forEach(variable => {
                if (variable && variable.name && variable.type && variable.id) {
                  workspace.createVariable(variable.name, variable.type, variable.id);
                }
              });
            }
          }
        } catch (error) {
          console.error('Error loading initial state:', error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Cleanup
      return () => {
        if (workspaceRef.current) {
          workspaceRef.current.dispose();
          workspaceRef.current = null;
          setIsInitialized(false);
        }
      };
    } catch (error) {
      console.error('Error initializing workspace:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [toolbox, workspaceConfiguration, readOnly, theme, initialState, value, onError]);

  // Handle controlled state updates
  useEffect(() => {
    if (!workspaceRef.current || !value || !isInitialized) return;

    try {
      const workspace = workspaceRef.current;
      workspace.clear();
      Blockly.serialization.workspaces.load(value.blocks, workspace);

      // Load variables if they exist and are iterable
      if (value.variables && Array.isArray(value.variables)) {
        value.variables.forEach(variable => {
          if (variable && variable.name && variable.type && variable.id) {
            workspace.createVariable(variable.name, variable.type, variable.id);
          }
        });
      }
    } catch (error) {
      console.error('Error updating workspace state:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [value, isInitialized, onError]);

  // Change listener
  useEffect(() => {
    if (!workspaceRef.current || !isInitialized) return;

    const workspace = workspaceRef.current;
    const changeListener = () => {
      try {
        const blocks = Blockly.serialization.workspaces.save(workspace);
        const variables = workspace.getAllVariables().map(v => ({
          id: v.getId(),
          name: v.name,
          type: v.type,
        }));

        const state: WorkspaceState = {
          blocks,
          variables,
        };
        onChange?.(state);

        // Call onWorkspaceChange with the workspace data
        onWorkspaceChange?.({
          workspace: blocks,
          triggers: [], // These would need to be extracted from the workspace
          conditions: [], // These would need to be extracted from the workspace
        });
      } catch (error) {
        console.error('Error handling workspace change:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    workspace.addChangeListener(changeListener);
    return () => workspace.removeChangeListener(changeListener);
  }, [isInitialized, onChange, onError, onWorkspaceChange]);

  // Auto-save functionality
  useEffect(() => {
    if (!workspaceRef.current || !isInitialized || autoSaveInterval <= 0) return;

    const interval = setInterval(() => {
      try {
        const workspace = workspaceRef.current;
        if (!workspace) return;

        const blocks = Blockly.serialization.workspaces.save(workspace);
        const variables = workspace.getAllVariables().map(v => ({
          id: v.getId(),
          name: v.name,
          type: v.type,
        }));

        const state: WorkspaceState = {
          blocks,
          variables,
        };
        onChange?.(state);

        // Call onWorkspaceChange with the workspace data
        onWorkspaceChange?.({
          workspace: blocks,
          triggers: [], // These would need to be extracted from the workspace
          conditions: [], // These would need to be extracted from the workspace
        });
      } catch (error) {
        console.error('Error during auto-save:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [isInitialized, autoSaveInterval, onChange, onWorkspaceChange, onError]);

  return (
    <div
      ref={containerRef}
      className="blockly-workspace"
      style={{ width: '100%', height: '100%', minHeight: '300px' }}
    >
      {isInitialized && children}
    </div>
  );
});

export const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({
  plugins = [],
  ...props
}) => (
  <BlocklyPluginProvider plugins={plugins} workspace={props.value?.blocks}>
    <BlocklyWorkspaceCore {...props} />
  </BlocklyPluginProvider>
);

export default BlocklyWorkspace;
