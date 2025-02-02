import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StateChangeInspector } from '../index';
import { haClient } from '../../../services/haClient';
import type { EntityState } from '../../../services/haClient';

// Mock haClient
jest.mock('../../../services/haClient', () => ({
  haClient: {
    onStateChanged: jest.fn(),
  },
}));

const mockEntityState: EntityState = {
  state: 'on',
  attributes: {
    friendly_name: 'Living Room Light',
    brightness: 255,
  },
  last_updated: '2024-02-02T18:00:00.000Z',
};

const mockNewEntityState: EntityState = {
  ...mockEntityState,
  attributes: {
    ...mockEntityState.attributes,
    brightness: 128,
  },
  last_updated: '2024-02-02T18:01:00.000Z',
};

describe('StateChangeInspector', () => {
  let mockUnsubscribe: jest.Mock;
  let mockOnStateChanged: jest.Mock & { callback?: (entityId: string, newState: EntityState, oldState: EntityState) => void };

  beforeEach(() => {
    mockUnsubscribe = jest.fn();
    mockOnStateChanged = jest.fn((callback) => {
      // Store callback to trigger state changes later
      mockOnStateChanged.callback = callback;
      return mockUnsubscribe;
    }) as jest.Mock & { callback?: (entityId: string, newState: EntityState, oldState: EntityState) => void };
    (haClient.onStateChanged as jest.Mock).mockImplementation(mockOnStateChanged);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state initially', () => {
    render(<StateChangeInspector />);
    expect(screen.getByText('No state changes yet')).toBeInTheDocument();
  });

  it('subscribes to state changes on mount and unsubscribes on unmount', () => {
    const { unmount } = render(<StateChangeInspector />);
    expect(haClient.onStateChanged).toHaveBeenCalled();

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('displays state changes when they occur', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Simulate a state change
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );

    expect(screen.getByText(/Living Room Light/)).toBeInTheDocument();
    expect(screen.getByText(/changed from on to on/)).toBeInTheDocument();
  });

  it('handles search filtering', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add two state changes
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );
    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    mockOnStateChanged.callback(
      'switch.kitchen',
      { ...mockNewEntityState, attributes: { friendly_name: 'Kitchen Switch' } },
      mockEntityState
    );

    // Search for "living"
    const searchInput = screen.getByPlaceholderText('Search state changes...');
    fireEvent.change(searchInput, { target: { value: 'living' } });

    expect(screen.getByText(/Living Room Light/)).toBeInTheDocument();
    expect(screen.queryByText(/Kitchen Switch/)).not.toBeInTheDocument();
  });

  it('clears all state changes when clear button is clicked', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add a state change
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );

    expect(screen.getByText(/Living Room Light/)).toBeInTheDocument();

    // Click clear button
    fireEvent.click(screen.getByTitle('Clear all'));

    expect(screen.getByText('No state changes yet')).toBeInTheDocument();
  });

  it('expands and collapses state change details', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add a state change
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );

    // Initially, details should not be visible
    expect(screen.queryByText('Changes:')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText(/Living Room Light/));

    // Details should now be visible
    expect(screen.getByText('Changes:')).toBeInTheDocument();
    expect(screen.getByText('Full State:')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(screen.getByText(/Living Room Light/));

    // Details should be hidden again
    expect(screen.queryByText('Changes:')).not.toBeInTheDocument();
  });

  it('shows attribute changes in the diff view', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add a state change with different brightness
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );

    // Expand the details
    fireEvent.click(screen.getByText(/Living Room Light/));

    // Check for brightness change in diff view
    expect(screen.getByText('brightness:')).toBeInTheDocument();
    expect(screen.getByText('255')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('copies state change to clipboard', async () => {
    // Mock clipboard API
    const mockClipboard = {
      writeText: jest.fn(),
    };
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });

    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add a state change
    mockOnStateChanged.callback(
      'light.living_room',
      mockNewEntityState,
      mockEntityState
    );

    // Expand the details
    fireEvent.click(screen.getByText(/Living Room Light/));

    // Click copy button
    const copyButton = screen.getByTestId('ContentCopyIcon').parentElement;
    fireEvent.click(copyButton!);

    // Verify clipboard content
    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('light.living_room')
    );
  });

  it('limits the number of state changes to 50', () => {
    render(<StateChangeInspector />);

    if (!mockOnStateChanged.callback) {
      throw new Error('Callback not set');
    }
    // Add 51 state changes
    for (let i = 0; i < 51; i++) {
      mockOnStateChanged.callback(
        `light.room_${i}`,
        {
          ...mockNewEntityState,
          attributes: { friendly_name: `Room ${i}` },
          last_updated: new Date(2024, 1, 2, 18, i).toISOString(),
        },
        mockEntityState
      );
    }

    // Only 50 should be visible, and they should be the most recent ones
    expect(screen.queryByText('Room 0')).not.toBeInTheDocument();
    expect(screen.getByText('Room 50')).toBeInTheDocument();
  });
});
