import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import './AutomationEditor.css';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import { StateChangeInspector } from '../StateChangeInspector';
import Split from 'react-split';
import BlocklyEditor from '../BlocklyEditor';
import { automationService } from '../../services/automationService';
import { blocklyService } from '../../services/blocklyService';
import { AutomationCreateRequest, AutomationUpdateRequest, WorkspaceChangeData, TriggerDefinition, ConditionDefinition } from '../../types/automation';
import { BlocklyToolbox, BlockDefinition, WorkspaceState } from '../../types/blockly';

interface ToolboxState {
  toolbox: BlocklyToolbox | null;
  blocks: BlockDefinition[];
}

const AutomationEditorComponent = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const mountedRef = useRef(true);
  const blocklyEditorRef = useRef<BlocklyEditor>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [version, setVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toolboxState, setToolboxState] = useState<ToolboxState>({ toolbox: null, blocks: [] });
  const [error, setError] = useState<string | null>(null);
  const [toolboxError, setToolboxError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loadedAutomation, setLoadedAutomation] = useState<{workspace?: WorkspaceState}>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

const loadToolbox = useCallback(async () => {
  console.log('Starting toolbox load...');
  try {
    const config = await blocklyService.getToolboxConfig();
    console.log('Toolbox config loaded:', {
      hasToolbox: !!config.toolbox,
      hasBlocks: !!config.blocks,
      numCategories: config.toolbox?.contents?.length,
      numBlocks: config.blocks?.length
    });

    if (!config.toolbox || !config.blocks) {
      throw new Error('Invalid toolbox configuration received from server');
    }

    return config;
  } catch (err) {
    console.error('Error loading toolbox:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to load Blockly toolbox';
    throw new Error(errorMessage);
  }
}, []); // No dependencies needed as it's a pure async operation

  const loadAutomation = useCallback(async () => {
    console.log('Starting automation load...');
    try {
      const automation = await automationService.getAutomation(id!);
      console.log('Automation loaded:', {
        id: automation.id,
        name: automation.name,
        hasWorkspace: !!automation.workspace
      });

      return automation;
    } catch (err) {
      console.error('Error loading automation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load automation';
      throw new Error(errorMessage);
    }
  }, [id]);

  useEffect(() => {
    console.log('Initializing editor...');
    let mounted = true;

    const initializeEditor = async () => {
      try {
        // Load toolbox first
        const toolboxConfig = await loadToolbox();

        // Load automation if we have an ID
        let automation;
        if (id) {
          automation = await loadAutomation();
        }

        // Update all states at once if still mounted
        if (mounted) {
          setToolboxState({
            toolbox: toolboxConfig.toolbox,
            blocks: toolboxConfig.blocks
          });

          if (automation) {
            setName(automation.name);
            setDescription(automation.description || '');
            setEnabled(automation.enabled);
            setVersion(automation.version);
            setLoadedAutomation(automation);
          }

          setError(null);
          setToolboxError(null);
        }
      } catch (error) {
        console.error('Error initializing editor:', error);
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize editor';
          setError(errorMessage);
          setToolboxError(errorMessage);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeEditor();

    return () => {
      console.log('Cleaning up editor state');
      mounted = false;
      // Reset all state
      setName('');
      setDescription('');
      setEnabled(true);
      setVersion(1);
      setError(null);
      setToolboxError(null);
      setSuccessMessage(null);
      setToolboxState({ toolbox: null, blocks: [] });
      setLoadedAutomation(undefined);
    };
  }, [id, loadToolbox, loadAutomation]); // Include all used callbacks

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const currentState = blocklyEditorRef.current?.getWorkspaceState();
    if (!currentState) {
      setError('Please add some blocks to your automation');
      return;
    }

    try {
      // Extract triggers and conditions from workspace
      const triggers: TriggerDefinition[] = [];
      const conditions: ConditionDefinition[] = [];

      // For now, we'll use empty arrays since the extraction logic will be implemented later
      const automationData: Omit<AutomationCreateRequest, 'id'> = {
        name,
        description: description || undefined,
        workspace: currentState,
        triggers,
        conditions
      };

      if (isEditing) {
        const updateData: AutomationUpdateRequest = {
          ...automationData,
          enabled,
          version,
        };
        await automationService.updateAutomation(id!, updateData);
        setSuccessMessage('Automation updated successfully');
        navigate('/automations');
      } else {
        const result = await automationService.createAutomation(automationData);
        setSuccessMessage('Automation created successfully');
        navigate('/automations');
      }
    } catch (err) {
      setError('Failed to save automation');
      console.error('Error saving automation:', err);
    }
  }, [name, description, isEditing, enabled, version, id, navigate]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  }, []);

  const memoizedToolbox = useMemo<BlocklyToolbox | undefined>(() =>
    toolboxState.toolbox ? {
      ...toolboxState.toolbox,
      blocks: toolboxState.blocks
    } : undefined
  , [toolboxState.toolbox, toolboxState.blocks]);

  const handleCancel = useCallback(() => {
    navigate('/automations');
  }, [navigate]);

  // Show loading state
  if (loading) {
    console.log('Showing loading state');

    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading editor...</Typography>
      </Box>
    );
  }

  // Show error state
  if (toolboxError || error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {toolboxError || error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Box>
    );
  }

  // Show error if toolbox is missing
  if (!toolboxState.toolbox || !toolboxState.blocks) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">
          Blockly toolbox configuration is incomplete or invalid
        </Alert>
      </Box>
    );
  }

  console.log('Rendering BlocklyEditor with toolbox:', memoizedToolbox);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom sx={{ p: 2 }}>
        {isEditing ? 'Edit Automation' : 'Create New Automation'}
      </Typography>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Split
          sizes={[70, 30]}
          minSize={200}
          expandToMin={false}
          gutterSize={10}
          gutterAlign="center"
          direction="horizontal"
          className="split"
        >
          <div className="blockly-container">
            <BlocklyEditor
              key={id} // Use id as key to ensure proper remounting when switching automations
              initialState={loadedAutomation?.workspace}
              ref={blocklyEditorRef}
              onError={error => setError(error.message)}
              toolbox={memoizedToolbox}
              readOnly={false}
              workspaceConfiguration={{
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
                trashcan: true
              }}
            />
          </div>

          <div className="sidebar">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tab label="Details" />
                <Tab label="Raw JSON" />
                <Tab
                  label={
                    <Badge color="primary" variant="dot" invisible={false}>
                      State Changes
                    </Badge>
                  }
                />
              </Tabs>
            </Box>

            <Box className="sidebar-content" sx={{ p: 2 }}>
              {selectedTab === 0 && (
                <form onSubmit={(e) => e.preventDefault()}>
                  <TextField
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                    margin="normal"
                  />
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    margin="normal"
                  />
                  {isEditing && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Enabled"
                        sx={{ mt: 2 }}
                      />
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Version: {version}
                      </Typography>
                    </>
                  )}
                </form>
              )}
              {selectedTab === 1 && (
                <Box sx={{ mt: 2 }}>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    margin: 0
                  }}>
                    {JSON.stringify(blocklyEditorRef.current?.getWorkspaceState() || null, null, 2)}
                  </pre>
                </Box>
              )}
              {selectedTab === 2 && (
                <Box sx={{
                  mt: 2,
                  height: 'calc(100vh - 250px)',
                  '& .state-change-inspector': {
                    height: '100%',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }
                }}>
                  <StateChangeInspector />
                </Box>
              )}
            </Box>

            <Box className="sidebar-footer" sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
              >
                {isEditing ? 'Update' : 'Create'} Automation
              </Button>
            </Box>
          </div>
        </Split>
      </Box>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export const AutomationEditor = memo(AutomationEditorComponent);
