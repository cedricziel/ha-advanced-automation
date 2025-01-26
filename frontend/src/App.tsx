import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AutomationsList } from './components/AutomationsList';
import { AutomationEditor } from './components/AutomationEditor';
import { haClient } from './services/haClient';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Create a theme instance matching Home Assistant's style
const theme = createTheme({
  palette: {
    primary: {
      main: '#03a9f4', // Home Assistant blue
    },
    secondary: {
      main: '#4caf50', // Success green
    },
    error: {
      main: '#f44336', // Error red
    },
    background: {
      default: '#f5f5f5',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#000000',
        },
      },
    },
  },
});

interface AppContentProps {
  connectionStatus: 'connecting' | 'connected' | 'error';
}

const AppContent: React.FC<AppContentProps> = ({ connectionStatus }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const showBackButton = location.pathname.includes('/automations/') && location.pathname !== '/automations';

  return (
    <>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            {showBackButton && (
              <Button
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/automations')}
                sx={{ mr: 2 }}
              >
                Back to Automations
              </Button>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Home Assistant Advanced Automation
            </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: connectionStatus === 'connected' ? '#4caf50' : '#f44336',
                  }}
                />
                <Typography variant="body2">
                  {connectionStatus === 'connected' ? 'Connected' : 'Connection Error'}
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Routes key={pathname}>
              <Route path="/" element={<Navigate to="/automations" replace />} />
              <Route path="/automations" element={<AutomationsList />} />
              <Route path="/automations/new" element={<AutomationEditor />} />
              <Route path="/automations/:id/edit" element={<AutomationEditor />} />
            </Routes>
          </Container>
        </Box>
    </>
  );
};

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const initializeHaClient = async () => {
      try {
        await haClient.getAllStates();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize HA client:', error);
        setConnectionStatus('error');
      }
    };

    initializeHaClient();
  }, []);

  if (connectionStatus === 'connecting') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Failed to connect to Home Assistant. Please check your configuration and try again.
          </Alert>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppContent connectionStatus={connectionStatus} />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
