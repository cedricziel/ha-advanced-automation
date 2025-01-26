# Home Assistant Advanced Automation

Advanced automation builder with visual programming and scripting support for Home Assistant.

## Overview

Home Assistant Advanced Automation is a powerful add-on that provides a visual programming interface for creating complex automations in Home Assistant. Using the Blockly visual programming interface, users can create sophisticated automation logic without writing code.

## Features

- 🎨 Visual Programming Interface using Blockly
- 🌐 Web-based UI with Home Assistant integration
- 🔧 Advanced scripting capabilities
- 🏗️ Custom automation blocks
- 🔌 Direct Home Assistant entity integration
- 🔒 Secure WebSocket communication
- 📱 Responsive web interface
- 🏠 Native Home Assistant add-on

## Installation

1. Add our repository to your Home Assistant add-on store:

   ```
   https://github.com/cedricziel/ha-advanced-automation
   ```

2. Install the "Advanced Automation" add-on
3. Configure the add-on:

   ```yaml
   log_level: info  # Options: trace, debug, info, warning, error, fatal
   ```

4. Start the add-on
5. Click "OPEN WEB UI" to access the automation builder

## Development Setup

### Prerequisites

- Node.js 20.x
- Rust 1.75 or later
- Docker (for containerized deployment)

### Frontend Development

```bash
cd frontend
npm install
npm start
```

The frontend development server will start at `http://localhost:3000`.

### Backend Development

```bash
cd backend
cargo run
```

The backend server will start at `http://localhost:3001`.

## Building

### Docker Build

Build the complete application:

```bash
docker build -t ha-advanced-automation .
```

### Manual Build

1. Build the frontend:

```bash
cd frontend
npm install
npm run build
```

2. Build the backend:

```bash
cd backend
cargo build --release
```

## Architecture

### Frontend

- React 18 with TypeScript
- Blockly for visual programming
- WebSocket communication with backend
- Responsive design

### Backend

- Rust with Axum web framework
- WebSocket server for real-time updates
- Static file serving
- Home Assistant API integration

### Communication Flow

1. Frontend connects to backend via WebSocket
2. Backend maintains connection with Home Assistant
3. Real-time entity updates and automation execution
4. Static assets served by Rust backend

## Supported Architectures

- amd64
- aarch64
- armv7
- armhf
- i386

## Configuration

The add-on exposes the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| log_level | The log level for the application | info |

## Port

The add-on runs on port 3001 and provides ingress support for seamless Home Assistant integration.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.
