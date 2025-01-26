export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggers: any[]; // Blockly workspace state for triggers
  conditions: any[]; // Blockly workspace state for conditions
  actions: any[]; // Blockly workspace state for actions
  created_at: string;
  updated_at: string;
}

export interface AutomationResponse {
  automations: Automation[];
}

export interface AutomationCreateRequest {
  name: string;
  description?: string;
  triggers: any[];
  conditions: any[];
  actions: any[];
}

export interface AutomationUpdateRequest extends AutomationCreateRequest {
  enabled: boolean;
}
