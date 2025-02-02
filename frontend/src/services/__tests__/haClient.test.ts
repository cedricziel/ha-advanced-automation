import { haClient } from '../haClient';
import type { EntityState, HAAction } from '../haClient';

describe('HAClient', () => {
  let mockWebSocket: WebSocket;
  let fetchSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let mockStates: Record<string, EntityState>;
  let mockActions: Record<string, HAAction>;
  let mockReadyState: number;

  beforeEach(() => {
    mockReadyState = WebSocket.CLOSED;

    // Mock WebSocket
    const mockWS = {
      close: jest.fn(),
      send: jest.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      url: '',
      binaryType: 'blob',
      bufferedAmount: 0,
      extensions: '',
      protocol: '',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };

    // Add read-only readyState property
    Object.defineProperty(mockWS, 'readyState', {
      get: () => mockReadyState,
      configurable: true
    });

    mockWebSocket = mockWS as unknown as WebSocket;

    // Mock window.WebSocket
    (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn(() => mockWebSocket);

    // Mock fetch
    fetchSpy = jest.spyOn(global, 'fetch');

    // Mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock states data
    mockStates = {
      'light.living_room': {
        state: 'on',
        attributes: { brightness: 255 },
        last_updated: '2024-02-02T12:00:00Z'
      },
      'switch.kitchen': {
        state: 'off',
        attributes: {},
        last_updated: '2024-02-02T12:00:00Z'
      }
    };

    // Mock actions data
    mockActions = {
      'light.turn_on': {
        domain: 'light',
        name: 'turn_on',
        description: 'Turn on light',
        fields: {},
        id: 'light.turn_on'
      }
    };

    // Reset client state
    haClient.disconnect();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();
  });

  describe('connect', () => {
    it('should establish WebSocket connection successfully', async () => {
      const connectPromise = haClient.connect();

      // Mock successful states fetch
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);

      // Simulate successful connection
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);

      await connectPromise;

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost/ws');
      expect(fetchSpy).toHaveBeenCalledWith('/api/states');
    });

    it('should handle connection timeout', async () => {
      jest.useFakeTimers();

      const connectPromise = haClient.connect();

      // Advance timers to trigger timeout
      jest.advanceTimersByTime(10000);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
      expect(mockWebSocket.close).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle WebSocket errors', async () => {
      const connectPromise = haClient.connect();

      // Simulate WebSocket error
      mockWebSocket.onerror?.(new Event('error'));

      await expect(connectPromise).rejects.toThrow();
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));
    });
  });

  describe('state management', () => {
    beforeEach(async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);

      const connectPromise = haClient.connect();
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);
      await connectPromise;
    });

    it('should handle state changes', () => {
      const callback = jest.fn();
      haClient.onStateChanged(callback);

      // Simulate state change message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'state_changed',
          entity_id: 'light.living_room',
          state: {
            state: 'off',
            attributes: { brightness: 0 },
            last_updated: '2024-02-02T12:01:00Z'
          }
        })
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(
        'light.living_room',
        expect.objectContaining({ state: 'off' }),
        expect.objectContaining({ state: 'on' })
      );
    });

    it('should get current state for entity', () => {
      const state = haClient.getState('light.living_room');
      expect(state).toEqual(mockStates['light.living_room']);
    });

    it('should return undefined for unknown entity', () => {
      const state = haClient.getState('non.existent');
      expect(state).toBeUndefined();
    });
  });

  describe('getAllStates', () => {
    it('should fetch all states successfully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);

      const states = await haClient.getAllStates();

      expect(states).toEqual(mockStates);
      expect(fetchSpy).toHaveBeenCalledWith('/api/states');
    });

    it('should handle fetch error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      await expect(haClient.getAllStates()).rejects.toThrow('Failed to fetch states');
    });
  });

  describe('getActions', () => {
    it('should fetch actions successfully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActions)
      } as Response);

      const actions = await haClient.getActions();

      expect(actions).toEqual(mockActions);
      expect(fetchSpy).toHaveBeenCalledWith('/api/actions');
    });

    it('should handle fetch error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response);

      await expect(haClient.getActions()).rejects.toThrow('Failed to fetch actions: 500 Internal Server Error');
    });
  });

  describe('reconnection', () => {
    it('should attempt to reconnect after connection close', async () => {
      jest.useFakeTimers();

      // Initial connection
      const connectPromise = haClient.connect();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);
      await connectPromise;

      // Reset WebSocket mock for reconnection
      (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn(() => mockWebSocket);

      // Simulate connection close
      mockWebSocket.onclose?.({} as CloseEvent);

      // Advance timer to trigger reconnection
      jest.advanceTimersByTime(5000);

      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should not schedule multiple reconnections', async () => {
      jest.useFakeTimers();

      // Initial connection
      const connectPromise = haClient.connect();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);
      await connectPromise;

      // Reset WebSocket mock for reconnection
      (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn(() => mockWebSocket);

      // Simulate multiple connection closes
      mockWebSocket.onclose?.({} as CloseEvent);
      mockWebSocket.onclose?.({} as CloseEvent);
      mockWebSocket.onclose?.({} as CloseEvent);

      // Advance timer
      jest.advanceTimersByTime(5000);

      // Should only attempt one reconnection
      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should clean up on disconnect', async () => {
      const connectPromise = haClient.connect();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);
      await connectPromise;

      haClient.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should remove state change callback', async () => {
      const callback = jest.fn();

      // Setup connection
      const connectPromise = haClient.connect();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStates)
      } as Response);
      mockReadyState = WebSocket.OPEN;
      await mockWebSocket.onopen?.({} as Event);
      await connectPromise;

      // Add and then remove callback
      const removeCallback = haClient.onStateChanged(callback);
      removeCallback();

      // Simulate state change
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'state_changed',
          entity_id: 'light.living_room',
          state: {
            state: 'off',
            attributes: {},
            last_updated: '2024-02-02T12:01:00Z'
          }
        })
      } as MessageEvent);

      // Callback should not be called after removal
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
