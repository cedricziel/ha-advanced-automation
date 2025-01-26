import { Automation, AutomationCreateRequest, AutomationUpdateRequest, AutomationResponse } from '../types/automation';

class AutomationService {
  async getAllAutomations(): Promise<Automation[]> {
    const response = await fetch('/api/automations');
    if (!response.ok) {
      throw new Error('Failed to fetch automations');
    }
    const data = await response.json() as AutomationResponse;
    if (!data || !Array.isArray(data.automations)) {
      throw new Error('Invalid response format from server');
    }
    return data.automations;
  }

  async getAutomation(id: string): Promise<Automation> {
    const response = await fetch(`/api/automations/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch automation');
    }
    return response.json();
  }

  async createAutomation(automation: AutomationCreateRequest): Promise<Automation> {
    const response = await fetch('/api/automations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(automation),
    });
    if (!response.ok) {
      throw new Error('Failed to create automation');
    }
    return response.json();
  }

  async updateAutomation(id: string, automation: AutomationUpdateRequest): Promise<Automation> {
    const response = await fetch(`/api/automations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(automation),
    });
    if (!response.ok) {
      throw new Error('Failed to update automation');
    }
    return response.json();
  }

  async deleteAutomation(id: string): Promise<void> {
    const response = await fetch(`/api/automations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete automation');
    }
  }

  async toggleAutomation(id: string, enabled: boolean): Promise<Automation> {
    const response = await fetch(`/api/automations/${id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) {
      throw new Error('Failed to toggle automation');
    }
    return response.json();
  }
}

export const automationService = new AutomationService();
