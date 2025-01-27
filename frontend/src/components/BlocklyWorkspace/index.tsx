import React, { useRef, useEffect, useState, memo } from 'react';
import * as Blockly from 'blockly';
import './BlocklyWorkspace.css';
import { BlocklyPlugin, WorkspaceState } from '../../types/blockly';
import { BlocklyPluginProvider } from './BlocklyPluginProvider';
import { createWorkspaceConfig, WorkspaceConfigOptions } from './workspaceConfig';

interface BlocklyWorkspaceProps {
  // Core props
  initialState?: WorkspaceState;
  value?: WorkspaceState;
  onChange?: (state: WorkspaceState) => void;
  onError?: (error: Error) => void;

  // Configuration
  workspaceConfiguration?: WorkspaceConfigOptions;
  toolbox?: any;
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

            // Load variables
            initialState.variables?.forEach(variable => {
              workspace.createVariable(variable.name, variable.type, variable.id);
            });
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
  }, [toolbox, workspaceConfiguration, readOnly, theme, initialState, value]);

  // Handle controlled state updates
  useEffect(() => {
    if (!workspaceRef.current || !value || !isInitialized) return;

    try {
      const workspace = workspaceRef.current;
      workspace.clear();
      Blockly.serialization.workspaces.load(value.blocks, workspace);

      // Load variables
      value.variables?.forEach(variable => {
        workspace.createVariable(variable.name, variable.type, variable.id);
      });
    } catch (error) {
      console.error('Error updating workspace state:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [value, isInitialized]);

  // Change listener
  useEffect(() => {
    if (!workspaceRef.current || !isInitialized) return;

    const workspace = workspaceRef.current;
    const changeListener = () => {
      try {
        const state: WorkspaceState = {
          blocks: Blockly.serialization.workspaces.save(workspace),
          variables: workspace.getAllVariables().map(v => ({
            id: v.getId(),
            name: v.name,
            type: v.type,
          })),
        };
        onChange?.(state);
      } catch (error) {
        console.error('Error handling workspace change:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    workspace.addChangeListener(changeListener);
    return () => workspace.removeChangeListener(changeListener);
  }, [isInitialized, onChange]);

  // Auto-save functionality
  useEffect(() => {
    if (!workspaceRef.current || !isInitialized || autoSaveInterval <= 0) return;

    const interval = setInterval(() => {
      try {
        const workspace = workspaceRef.current;
        if (!workspace) return;

        const state: WorkspaceState = {
          blocks: Blockly.serialization.workspaces.save(workspace),
          variables: workspace.getAllVariables().map(v => ({
            id: v.getId(),
            name: v.name,
            type: v.type,
          })),
        };
        onChange?.(state);
      } catch (error) {
        console.error('Error during auto-save:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [isInitialized, autoSaveInterval, onChange]);

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
