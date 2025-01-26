import React, { useState, useEffect } from 'react';
import './App.css';
import BlocklyWorkspace from './components/BlocklyWorkspace';
import * as Blockly from 'blockly';
import { haClient } from './services/haClient';

function App() {
  const [workspaceState, setWorkspaceState] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [entities, setEntities] = useState<Record<string, any>>({});

  useEffect(() => {
    const initializeHaClient = async () => {
      try {
        await haClient.getAllStates()
          .then(states => {
            setEntities(states);
            setConnectionStatus('connected');
          })
          .catch(error => {
            console.error('Failed to fetch states:', error);
            setConnectionStatus('error');
          });
      } catch (error) {
        console.error('Failed to initialize HA client:', error);
        setConnectionStatus('error');
      }
    };

    initializeHaClient();
  }, []);

  const handleWorkspaceChange = (workspace: Blockly.Workspace) => {
    const state = Blockly.serialization.workspaces.save(workspace);
    setWorkspaceState(state);
  };

  if (connectionStatus === 'connecting') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Home Assistant Advanced Automation</h1>
        </header>
        <main style={{ padding: '20px', textAlign: 'center' }}>
          <p>Connecting to Home Assistant...</p>
        </main>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Home Assistant Advanced Automation</h1>
        </header>
        <main style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: 'red' }}>Failed to connect to Home Assistant. Please check your configuration and try again.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Home Assistant Advanced Automation</h1>
        <div className="connection-status">
          <span className="status-dot" style={{
            backgroundColor: connectionStatus === 'connected' ? '#4caf50' : '#f44336'
          }}></span>
          {connectionStatus === 'connected' ? 'Connected' : 'Connection Error'}
        </div>
      </header>
      <main style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
          <div style={{ flex: 2 }}>
            <BlocklyWorkspace onWorkspaceChange={handleWorkspaceChange} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '20px', overflowY: 'auto', borderRadius: '8px' }}>
              <h3>Workspace State</h3>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {workspaceState ? JSON.stringify(workspaceState, null, 2) : 'No blocks yet'}
              </pre>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '20px', overflowY: 'auto', borderRadius: '8px' }}>
              <h3>Available Entities</h3>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {Object.keys(entities).length > 0 ?
                  Object.keys(entities).map(entityId => (
                    <div key={entityId} style={{ marginBottom: '8px' }}>
                      <strong>{entityId}</strong>: {entities[entityId].state}
                    </div>
                  ))
                  : 'No entities available'}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
