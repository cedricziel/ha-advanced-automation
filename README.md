# Home Assistant Advanced Automation Builder

Advanced automation builder with visual programming and scripting support.

## Storage

The add-on stores automations as YAML files:

- In development mode: `./automations/*.yaml`
- In production mode: `/config/advanced-automation/automations/*.yaml`

Each automation is stored in its own file named by its UUID. The files are automatically included in Home Assistant backups since they are stored under the `/config` directory.

## Development

1. Set up environment variables:
   ```bash
   # backend/.env
   RUST_LOG=debug
   HA_HOST=localhost:8123
   HA_TOKEN=your_long_lived_access_token
   ```

2. Start the backend:
   ```bash
   cd backend
   cargo run
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Production

The add-on automatically mounts the Home Assistant `/config` directory and stores automations in `/config/advanced-automation/automations/`.
