export interface Feature {
  id: string;
  name: string;
  nameJa: string;
  icon: string;
  description: string;
  descriptionJa: string;
  samplePrompt: string;
  samplePromptJa: string;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  nameJa: string;
  type: 'number' | 'string' | 'select';
  default: string | number;
  options?: string[];
  unit?: string;
  description: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  structureFile?: StructureFile;
  executionReady?: ExecutionConfig;
}

export interface StructureFile {
  name: string;
  path: string;
  type: 'single' | 'zip' | 'list';
  validated: boolean;
  atoms?: number;
  formula?: string;
  lattice?: {
    a: number;
    b: number;
    c: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
  multiInfo?: {
    totalCount: number;
    samples: Array<{
      name?: string;
      atoms: number;
      formula: string;
      lattice?: {
        a: number;
        b: number;
        c: number;
      };
    }>;
  };
}

export interface ExecutionConfig {
  featureId: string;
  parameters: Record<string, string | number>;
  command: string;
}

export type ConversationState = 'waiting_structure' | 'structure_confirmed' | 'waiting_param_confirm' | 'ready_to_execute';

export interface ExecutionResult {
  id: string;
  featureId: string;
  featureNameEn: string;
  featureNameJa: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  command: string;
  outputEn: string;
  outputJa: string;
  startTime: Date;
  endTime?: Date;
}

export interface ResultFolder {
  name: string;
  path: string;
  file_count: number;
  total_size: number;
  modified: number;
}
