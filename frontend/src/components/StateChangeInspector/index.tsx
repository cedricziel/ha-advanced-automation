import React, { useState, useEffect, useRef } from 'react';
import './StateChangeInspector.css';
import {
  Box,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { haClient } from '../../services/haClient';
import type { EntityState } from '../../services/haClient';

interface StateChange {
  entityId: string;
  oldState: EntityState;
  newState: EntityState;
  timestamp: string;
  id: string;
}

export const StateChangeInspector: React.FC = () => {
  const [stateChanges, setStateChanges] = useState<StateChange[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = haClient.onStateChanged((entityId: string, newState: EntityState, oldState?: EntityState) => {
      setStateChanges(prev => {
        const change: StateChange = {
          entityId,
          oldState: oldState || { state: 'unknown', attributes: {}, last_updated: new Date().toISOString() },
          newState,
          timestamp: new Date().toISOString(),
          id: `${entityId}-${Date.now()}`
        };

        const updated = [change, ...prev].slice(0, 100);
        return updated;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleClearAll = () => {
    setStateChanges([]);
  };

  const handleCopy = (change: StateChange) => {
    const text = JSON.stringify({
      entityId: change.entityId,
      oldState: change.oldState,
      newState: change.newState,
      timestamp: change.timestamp
    }, null, 2);
    navigator.clipboard.writeText(text);
  };

  const filteredChanges = stateChanges.filter(change => {
    const searchLower = searchQuery.toLowerCase();
    return (
      change.entityId.toLowerCase().includes(searchLower) ||
      change.newState.state.toLowerCase().includes(searchLower) ||
      change.oldState.state.toLowerCase().includes(searchLower) ||
      change.newState.attributes?.friendly_name?.toLowerCase().includes(searchLower) ||
      JSON.stringify(change.newState.attributes).toLowerCase().includes(searchLower)
    );
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getChangeSummary = (change: StateChange) => {
    const friendlyName = change.newState.attributes?.friendly_name;
    const displayName = friendlyName ? `${friendlyName} (${change.entityId})` : change.entityId;
    const stateChange = change.oldState.state !== change.newState.state
      ? ` changed from ${change.oldState.state} to ${change.newState.state}`
      : ' attributes updated';
    return `${displayName}${stateChange}`;
  };

  const renderAttributesDiff = (oldAttrs: Record<string, any>, newAttrs: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);
    return Array.from(allKeys).map(key => {
      const oldValue = oldAttrs[key];
      const newValue = newAttrs[key];
      const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

      if (!hasChanged) return null;

      return (
        <div key={key} className="diff-line">
          <span className="diff-key">{key}:</span>
          <div>
            <div className="diff-value-old">{JSON.stringify(oldValue)}</div>
            <div className="diff-value-new">{JSON.stringify(newValue)}</div>
          </div>
        </div>
      );
    });
  };

  return (
    <Box className="state-change-inspector">
      <Box className="search-bar">
        <TextField
          size="small"
          fullWidth
          placeholder="Search state changes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Tooltip title="Clear all">
          <IconButton onClick={handleClearAll} size="small">
            <ClearAllIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box ref={containerRef} className="changes-list">
        {filteredChanges.length === 0 && (
          <div className="no-changes">
            {stateChanges.length === 0 ? 'No state changes yet' : 'No matches found'}
          </div>
        )}
        {filteredChanges.map((change) => (
          <Accordion
            key={change.id}
            expanded={expandedPanel === change.id}
            onChange={(_, isExpanded) => setExpandedPanel(isExpanded ? change.id : false)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box className="change-summary">
                <Typography className="entity-name">
                  {getChangeSummary(change)}
                </Typography>
                <Typography className="timestamp" variant="caption">
                  {formatTime(change.timestamp)}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box className="change-details">
                <IconButton
                  className="copy-button"
                  size="small"
                  onClick={() => handleCopy(change)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>

                <div className="diff-section">
                  <Typography className="diff-title" variant="subtitle2">
                    Changes:
                  </Typography>
                  <div className="diff-content">
                    {renderAttributesDiff(change.oldState.attributes, change.newState.attributes)}
                  </div>
                </div>

                <div className="diff-section">
                  <Typography className="diff-title" variant="subtitle2">
                    Full State:
                  </Typography>
                  <pre className="diff-content">
                    {JSON.stringify(change.newState, null, 2)}
                  </pre>
                </div>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};
