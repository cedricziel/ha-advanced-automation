export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  version: number;
  triggers: TriggerDefinition[];
  workspace: BlocklyWorkspaceState;
  conditions: ConditionDefinition[];
  created_at: string;
  updated_at: string;
}

export interface TriggerDefinition {
  type: string;
  config: Record<string, any>;
}

export interface ConditionDefinition {
  type: string;
  config: Record<string, any>;
}

export type BlocklyWorkspaceState = any; // Blockly's workspace serialization type

export interface WorkspaceChangeData {
  workspace: any; // Blockly workspace serialization
  triggers: TriggerDefinition[];
  conditions: ConditionDefinition[];
}

export interface AutomationResponse {
  automations: Automation[];
}

export interface AutomationCreateRequest {
  name: string;
  description?: string;
  triggers: TriggerDefinition[];
  workspace: BlocklyWorkspaceState;
  conditions: ConditionDefinition[];
}

export interface AutomationUpdateRequest extends AutomationCreateRequest {
  enabled: boolean;
  version: number;
}
