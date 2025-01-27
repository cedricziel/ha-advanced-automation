import React, { useState, useEffect, useCallback } from 'react';
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
import BlocklyWorkspace from '../BlocklyWorkspace';
import { automationService } from '../../services/automationService';
import { blocklyService } from '../../services/blocklyService';
import { AutomationCreateRequest, AutomationUpdateRequest, WorkspaceChangeData } from '../../types/automation';
import { BlocklyToolbox, BlockDefinition } from '../../types/blockly';

interface EditorState {
  workspace: any;
  triggers: any[];
  conditions: any[];
}

interface ToolboxState {
  toolbox: BlocklyToolbox | null;
  blocks: BlockDefinition[];
}

export const AutomationEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [version, setVersion] = useState(1);
  const [editorState, setEditorState] = useState<EditorState>({
    workspace: null,
    triggers: [],
    conditions: []
  });
  const [loading, setLoading] = useState(true);
  const [toolboxState, setToolboxState] = useState<ToolboxState>({ toolbox: null, blocks: [] });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const loadToolbox = React.useCallback(async () => {
    try {
      const config = await blocklyService.getToolboxConfig();
      setToolboxState({
        toolbox: config.toolbox,
        blocks: config.blocks
      });
    } catch (err) {
      setError('Failed to load Blockly toolbox');
      console.error('Error loading toolbox:', err);
    }
  }, []);

  const loadAutomation = React.useCallback(async () => {
    try {
      const automation = await automationService.getAutomation(id!);
      setName(automation.name);
      setDescription(automation.description || '');
      setEnabled(automation.enabled);
      setVersion(automation.version);
      setEditorState({
        workspace: automation.workspace,
        triggers: automation.triggers,
        conditions: automation.conditions
      });
    } catch (err) {
      setError('Failed to load automation');
      console.error('Error loading automation:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Load toolbox configuration first
    loadToolbox().then(() => {
      // Then load automation if editing
      if (id) {
        loadAutomation();
      } else {
        setLoading(false);
      }
    });

    return () => {
      // Cleanup state when component unmounts
      setName('');
      setDescription('');
      setEnabled(true);
      setVersion(1);
      setEditorState({
        workspace: null,
        triggers: [],
        conditions: []
      });
      setError(null);
      setSuccessMessage(null);
    };
  }, [id, loadAutomation, loadToolbox]);

  const handleWorkspaceChange = useCallback((data: WorkspaceChangeData) => {
    setEditorState(prevState => {
      // Only update if the data has actually changed
      if (JSON.stringify(prevState) === JSON.stringify(data)) {
        return prevState;
      }
      return {
        workspace: data.workspace,
        triggers: data.triggers,
        conditions: data.conditions
      };
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorState.workspace) {
      setError('Please add some blocks to your automation');
      return;
    }

    try {
      const automationData = {
        name,
        description: description || undefined,
        triggers: editorState.triggers,
        workspace: editorState.workspace,
        conditions: editorState.conditions,
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
        const createData: AutomationCreateRequest = automationData;
        await automationService.createAutomation(createData);
        setSuccessMessage('Automation created successfully');
        navigate('/automations');
      }
    } catch (err) {
      setError('Failed to save automation');
      console.error('Error saving automation:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading automation...</Typography>
      </Box>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

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
            {!loading && toolboxState.toolbox && (
              <BlocklyWorkspace
                onWorkspaceChange={handleWorkspaceChange}
                initialState={editorState.workspace}
                key={id || 'new'} // Force new instance when switching automations
                toolbox={{
                  ...toolboxState.toolbox,
                  blocks: toolboxState.blocks
                }}
              />
            )}
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
                    {JSON.stringify(editorState, null, 2)}
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
                onClick={() => navigate('/automations')}
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
