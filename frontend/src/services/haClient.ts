type StateChangedCallback = (entityId: string, state: any) => void;

class HAClient {
    private ws: WebSocket | null = null;
    private stateCallbacks: StateChangedCallback[] = [];

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'state_changed') {
                    this.stateCallbacks.forEach(callback =>
                        callback(data.entity_id, data.state)
                    );
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    onStateChanged(callback: StateChangedCallback) {
        this.stateCallbacks.push(callback);
        return () => {
            this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
        };
    }

    async getAllStates() {
        const response = await fetch('/api/states');
        if (!response.ok) {
            throw new Error('Failed to fetch states');
        }
        return response.json();
    }
}

export const haClient = new HAClient();
