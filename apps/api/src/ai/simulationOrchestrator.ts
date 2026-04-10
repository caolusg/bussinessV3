export type SimulationStage =
  | 'acquisition'
  | 'quotation'
  | 'negotiation'
  | 'contract'
  | 'preparation'
  | 'customs'
  | 'settlement'
  | 'after_sales';

export type SimulationHistoryMessage = {
  role: 'student' | 'coach';
  content: string;
};

export type SimulationOrchestratorInput = {
  stage: SimulationStage;
  messages: SimulationHistoryMessage[];
};

export type SimulationAssessment = {
  score?: number;
  strengths?: string[];
  risks?: string[];
  summary?: string;
};

export type SimulationPersonaSnapshot = {
  cultureHints?: string[];
  difficultyAdjustment?: 'down' | 'keep' | 'up';
};

export type SimulationOrchestratorResult = {
  roleplayReply: string;
  coachNote?: string | null;
  assessment?: SimulationAssessment;
  personaSnapshot?: SimulationPersonaSnapshot;
  trace: {
    provider: 'openai' | 'openclaw';
    usedTools?: string[];
    usedWebSearch?: boolean;
    degraded?: boolean;
  };
};

export interface SimulationProvider {
  generateReply(
    input: SimulationOrchestratorInput
  ): Promise<SimulationOrchestratorResult>;
}

export class SimulationOrchestrator {
  constructor(private readonly provider: SimulationProvider) {}

  async generate(
    input: SimulationOrchestratorInput
  ): Promise<SimulationOrchestratorResult> {
    return this.provider.generateReply(input);
  }
}
