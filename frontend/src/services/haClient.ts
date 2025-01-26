export interface EntityState {
    state: string;
    attributes: Record<string, any>;
    last_updated: string;
}

type StateChangedCallback = (entityId: string, state: EntityState, oldState?: EntityState) => void;

class HAClient {
    private ws: WebSocket | null = null;
    private stateCallbacks: StateChangedCallback[] = [];
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private states: Map<string, EntityState> = new Map();
    private connectionPromise: Promise<void> | null = null;
    private connectionResolve: (() => void) | null = null;

    connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.connectionPromise = new Promise((resolve, reject) => {
            this.connectionResolve = resolve;

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
                this.ws?.close();
            }, 10000); // 10 second timeout

            this.ws!.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'state_changed') {
                        const { entity_id, state } = data;
                        if (entity_id && state) {
                            const oldState = this.states.get(entity_id);
                            this.states.set(entity_id, state);
                            this.stateCallbacks.forEach(callback => callback(entity_id, state, oldState));
                        }
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws!.onopen = async () => {
                try {
                    // Fetch initial states when connection is established
                    await this.getAllStates();
                    clearTimeout(timeout);
                    this.connectionResolve?.();
                    this.connectionPromise = null;
                    this.connectionResolve = null;
                } catch (error) {
                    console.error('Error fetching initial states:', error);
                    clearTimeout(timeout);
                    this.ws?.close(); // Force reconnection on error
                }
            };

            this.ws!.onclose = () => {
                clearTimeout(timeout);
                this.connectionPromise = null;
                this.connectionResolve = null;
                this.scheduleReconnect();
            };

            this.ws!.onerror = (error) => {
                console.error('WebSocket error:', error);
                clearTimeout(timeout);
                this.ws?.close();
            };
        });

        return this.connectionPromise;
    }

    private scheduleReconnect(): void {
        if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connect();
            }, 5000);
        }
    }

    onStateChanged(callback: StateChangedCallback): () => void {
        this.stateCallbacks.push(callback);
        // Immediately call callback with current states
        this.states.forEach((state, entityId) => callback(entityId, state, undefined));
        return () => {
            this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
        };
    }

    async getAllStates(): Promise<Record<string, EntityState>> {
        // If we're not connected, connect first
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            await this.connect();
        }
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

    disconnect(): void {
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
