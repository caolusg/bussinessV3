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
  productCatalogContext?: string | null;
  scenario?: {
    id?: string;
    name?: string;
    opponentName?: string | null;
    opponentRole?: string | null;
    systemPrompt?: string | null;
    difficulty?: string | null;
    promptVersion?: string | null;
  } | null;
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
    provider: 'deepseek' | 'compatible' | 'openclaw';
    usedTools?: string[];
    usedWebSearch?: boolean;
    degraded?: boolean;
    promptVersion?: string | null;
    scenarioId?: string | null;
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
