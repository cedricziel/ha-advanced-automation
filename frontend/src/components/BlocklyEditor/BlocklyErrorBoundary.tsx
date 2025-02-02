import React, { Component, ErrorInfo } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class BlocklyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BlocklyEditor error:', error);
    console.error('Error details:', errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          height: '100%',
          bgcolor: 'background.paper'
        }}>
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              The Blockly editor encountered an error
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
          </Alert>

          <Button
            variant="contained"
            color="primary"
            onClick={this.handleRetry}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>

          {import.meta.env.DEV && this.state.errorInfo && (
            <Box sx={{ mt: 4, width: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Error Details (Development Only):
              </Typography>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}
