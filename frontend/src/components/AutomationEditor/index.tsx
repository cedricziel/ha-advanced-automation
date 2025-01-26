import React, { useState, useEffect, useCallback } from 'react';
import './AutomationEditor.css';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import Split from 'react-split';
import BlocklyWorkspace from '../BlocklyWorkspace';
import { automationService } from '../../services/automationService';
import { AutomationCreateRequest, AutomationUpdateRequest } from '../../types/automation';
import * as Blockly from 'blockly';

export const AutomationEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [workspaceState, setWorkspaceState] = useState<any>(null);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const loadAutomation = React.useCallback(async () => {
    try {
      const automation = await automationService.getAutomation(id!);
      setName(automation.name);
      setDescription(automation.description || '');
      setEnabled(automation.enabled);
      setWorkspaceState({
        triggers: automation.triggers,
        conditions: automation.conditions,
        actions: automation.actions,
      });
    } catch (err) {
      setError('Failed to load automation');
      console.error('Error loading automation:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;

    if (id) {
      loadAutomation();
    }

    return () => {
      mounted = false;
      // Cleanup state when component unmounts
      setName('');
      setDescription('');
      setEnabled(true);
      setWorkspaceState(null);
      setError(null);
      setSuccessMessage(null);
    };
  }, [id, loadAutomation]);

  // Prevent state updates if component is unmounting
  const safeSetWorkspaceState = useCallback((state: any) => {
    if (state) {
      setWorkspaceState(state);
    }
  }, []);

  const handleWorkspaceChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (workspace: Blockly.Workspace) => {
        // Clear previous timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
          const state = Blockly.serialization.workspaces.save(workspace);
          setWorkspaceState(state);
        }, 300); // 300ms debounce
      };
    })(),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceState) {
      setError('Please add some blocks to your automation');
      return;
    }

    try {
      const automationData = {
        name,
        description: description || undefined,
        triggers: workspaceState.triggers || [],
        conditions: workspaceState.conditions || [],
        actions: workspaceState.actions || [],
      };

      if (isEditing) {
        const updateData: AutomationUpdateRequest = {
          ...automationData,
          enabled,
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
            <BlocklyWorkspace
              onWorkspaceChange={safeSetWorkspaceState}
              initialState={workspaceState}
            />
          </div>

          <div className="sidebar">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tab label="Details" />
                <Tab label="Raw JSON" />
              </Tabs>
            </Box>

            <Box className="sidebar-content" sx={{ p: 2 }}>
              {selectedTab === 0 ? (
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
                  )}
                </form>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    margin: 0
                  }}>
                    {JSON.stringify(workspaceState, null, 2)}
                  </pre>
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
