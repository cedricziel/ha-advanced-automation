import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutomationsList } from '../index';
import { automationService } from '../../../services/automationService';
import { Automation } from '../../../types/automation';
import { MemoryRouter } from 'react-router-dom';

// Mock the router hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/automations' }),
}));

// Mock the automation service
jest.mock('../../../services/automationService');

const mockAutomations: Automation[] = [
  {
    id: '1',
    name: 'Test Automation 1',
    description: 'Test Description 1',
    enabled: true,
    version: 1,
    triggers: [],
    conditions: [],
    workspace: {},
    created_at: '2024-02-01T12:00:00Z',
    updated_at: '2024-02-01T12:00:00Z',
  },
  {
    id: '2',
    name: 'Test Automation 2',
    enabled: false,
    version: 2,
    triggers: [],
    conditions: [],
    workspace: {},
    created_at: '2024-02-01T13:00:00Z',
    updated_at: '2024-02-01T13:00:00Z',
  },
];

describe('AutomationsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (automationService.getAllAutomations as jest.Mock).mockResolvedValue(mockAutomations);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AutomationsList />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByText('Loading automations...')).toBeInTheDocument();
  });

  it('renders automations after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
      expect(screen.getByText('Test Description 1')).toBeInTheDocument();
      expect(screen.getByText('Test Automation 2')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Search automations');
    fireEvent.change(searchInput, { target: { value: 'Automation 1' } });

    expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Automation 2')).not.toBeInTheDocument();
  });

  it('navigates to edit page when edit button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('EditIcon');
    fireEvent.click(editButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/automations/1/edit');
  });

  it('handles toggle automation', async () => {
    (automationService.toggleAutomation as jest.Mock).mockResolvedValue({
      ...mockAutomations[0],
      enabled: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
    });

    const switches = screen.getAllByRole('checkbox');
    fireEvent.click(switches[0]);

    expect(automationService.toggleAutomation).toHaveBeenCalledWith('1', false);
  });

  it('handles delete automation', async () => {
    (automationService.deleteAutomation as jest.Mock).mockResolvedValue(undefined);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Automation 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    fireEvent.click(deleteButtons[0]);

    // Confirm delete dialog appears
    expect(screen.getByText(/Are you sure you want to delete "Test Automation 1"/)).toBeInTheDocument();

    // Click delete button
    const confirmDeleteButton = screen.getByText('Delete');
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(automationService.deleteAutomation).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Test Automation 1')).not.toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to load automations';
    (automationService.getAllAutomations as jest.Mock).mockRejectedValue(new Error(errorMessage));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('navigates to new automation page when add button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('New Automation')).toBeInTheDocument();
    });

    const addButton = screen.getByText('New Automation');
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/automations/new');
  });
});
