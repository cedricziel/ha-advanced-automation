import React, { useState } from 'react';
import './App.css';
import BlocklyWorkspace from './components/BlocklyWorkspace';
import * as Blockly from 'blockly';

function App() {
  const [workspaceState, setWorkspaceState] = useState<any>(null);

  const handleWorkspaceChange = (workspace: Blockly.Workspace) => {
    const state = Blockly.serialization.workspaces.save(workspace);
    setWorkspaceState(state);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Home Assistant Advanced Automation</h1>
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
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
