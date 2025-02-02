import { automationService } from '../automationService';
import { Automation, AutomationCreateRequest, AutomationUpdateRequest, TriggerDefinition, ConditionDefinition } from '../../types/automation';

describe('AutomationService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockTriggers: TriggerDefinition[] = [
    { type: 'test_trigger', config: {} }
  ];

  const mockConditions: ConditionDefinition[] = [
    { type: 'test_condition', config: {} }
  ];

  const mockWorkspace = {};

  describe('getAllAutomations', () => {
    it('should fetch and return automations successfully', async () => {
      const mockAutomations: Automation[] = [
        {
          id: '1',
          name: 'Test Automation 1',
          enabled: true,
          version: 1,
          triggers: mockTriggers,
          conditions: mockConditions,
          workspace: mockWorkspace,
          created_at: '2024-02-02T12:00:00Z',
          updated_at: '2024-02-02T12:00:00Z'
        },
        {
          id: '2',
          name: 'Test Automation 2',
          enabled: false,
          version: 1,
          triggers: mockTriggers,
          conditions: mockConditions,
          workspace: mockWorkspace,
          created_at: '2024-02-02T12:00:00Z',
          updated_at: '2024-02-02T12:00:00Z'
        }
      ];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ automations: mockAutomations }),
      } as Response);

      const result = await automationService.getAllAutomations();

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations');
      expect(result).toEqual(mockAutomations);
    });

    it('should throw error when response is not ok', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(automationService.getAllAutomations()).rejects.toThrow('Failed to fetch automations');
    });

    it('should throw error when response format is invalid', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'format' }),
      } as Response);

      await expect(automationService.getAllAutomations()).rejects.toThrow('Invalid response format from server');
    });
  });

  describe('getAutomation', () => {
    it('should fetch and return a single automation', async () => {
      const mockAutomation: Automation = {
        id: '1',
        name: 'Test Automation',
        enabled: true,
        version: 1,
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace,
        created_at: '2024-02-02T12:00:00Z',
        updated_at: '2024-02-02T12:00:00Z'
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAutomation),
      } as Response);

      const result = await automationService.getAutomation('1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations/1');
      expect(result).toEqual(mockAutomation);
    });

    it('should throw error when automation is not found', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(automationService.getAutomation('1')).rejects.toThrow('Failed to fetch automation');
    });
  });

  describe('createAutomation', () => {
    it('should create and return a new automation', async () => {
      const createRequest: AutomationCreateRequest = {
        name: 'New Automation',
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace
      };

      const mockResponse: Automation = {
        id: '1',
        ...createRequest,
        enabled: true,
        version: 1,
        created_at: '2024-02-02T12:00:00Z',
        updated_at: '2024-02-02T12:00:00Z'
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await automationService.createAutomation(createRequest);

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createRequest),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when creation fails', async () => {
      const createRequest: AutomationCreateRequest = {
        name: 'New Automation',
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace
      };

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      await expect(automationService.createAutomation(createRequest)).rejects.toThrow('Failed to create automation');
    });
  });

  describe('updateAutomation', () => {
    it('should update and return the automation', async () => {
      const updateRequest: AutomationUpdateRequest = {
        name: 'Updated Automation',
        enabled: false,
        version: 1,
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace
      };

      const mockResponse: Automation = {
        id: '1',
        ...updateRequest,
        created_at: '2024-02-02T12:00:00Z',
        updated_at: '2024-02-02T12:00:00Z'
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await automationService.updateAutomation('1', updateRequest);

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateRequest),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when update fails', async () => {
      const updateRequest: AutomationUpdateRequest = {
        name: 'Updated Automation',
        enabled: false,
        version: 1,
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace
      };

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(automationService.updateAutomation('1', updateRequest)).rejects.toThrow('Failed to update automation');
    });
  });

  describe('deleteAutomation', () => {
    it('should delete the automation successfully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await automationService.deleteAutomation('1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations/1', {
        method: 'DELETE',
      });
    });

    it('should throw error when deletion fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(automationService.deleteAutomation('1')).rejects.toThrow('Failed to delete automation');
    });
  });

  describe('toggleAutomation', () => {
    it('should toggle automation state successfully', async () => {
      const mockResponse: Automation = {
        id: '1',
        name: 'Test Automation',
        enabled: true,
        version: 1,
        triggers: mockTriggers,
        conditions: mockConditions,
        workspace: mockWorkspace,
        created_at: '2024-02-02T12:00:00Z',
        updated_at: '2024-02-02T12:00:00Z'
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await automationService.toggleAutomation('1', true);

      expect(fetchSpy).toHaveBeenCalledWith('/api/automations/1/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when toggle fails', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(automationService.toggleAutomation('1', true)).rejects.toThrow('Failed to toggle automation');
    });
  });
});
