interface EntityState {
    state: string;
    attributes: Record<string, any>;
    last_updated: string;
}

type StateChangedCallback = (entityId: string, state: EntityState) => void;

class HAClient {
    private ws: WebSocket | null = null;
    private stateCallbacks: StateChangedCallback[] = [];
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private states: Map<string, EntityState> = new Map();

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'state_changed') {
                    const { entity_id, state } = data;
                    if (entity_id && state) {
                        this.states.set(entity_id, state);
                        this.stateCallbacks.forEach(callback => callback(entity_id, state));
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            // Fetch initial states when connection is established
            this.getAllStates().catch(console.error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed. Reconnecting in 5s...');
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.ws?.close();
        };
    }

    private scheduleReconnect() {
        if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect();
            }, 5000);
        }
    }

    onStateChanged(callback: StateChangedCallback) {
        this.stateCallbacks.push(callback);
        // Immediately call callback with current states
        this.states.forEach((state, entityId) => callback(entityId, state));
        return () => {
            this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
        };
    }

    async getAllStates(): Promise<Record<string, EntityState>> {
        try {
            const response = await fetch('/api/states');
            if (!response.ok) {
                throw new Error('Failed to fetch states');
            }
            const states = await response.json();
            // Update local state cache
            Object.entries(states).forEach(([entityId, state]) => {
                this.states.set(entityId, state as EntityState);
            });
            return states;
        } catch (error) {
            console.error('Error fetching states:', error);
            throw error;
        }
    }

    getState(entityId: string): EntityState | undefined {
        return this.states.get(entityId);
    }

    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const haClient = new HAClient();
