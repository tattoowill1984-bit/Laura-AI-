import { SpecialistOpinion, ObservationEnvelopeVNext } from './types';

export class SpecialistConsortium {
  public consultSpecialists(obs: ObservationEnvelopeVNext, posture: string): SpecialistOpinion[] {
    const opinions: SpecialistOpinion[] = [];
    const text = obs.rawContent;

    // 1. ResearchAgent
    const lowerText = text.toLowerCase();
    const isSearchQuery = lowerText.includes('search') || lowerText.includes('web') || lowerText.includes('lookup') || lowerText.includes('news') || lowerText.includes('latest') || lowerText.includes('who is') || lowerText.includes('what is');
    opinions.push({
      specialistName: 'ResearchAgent',
      perspective: 'Empirical knowledge, live web retrieval, and external fact verification.',
      recommendation: isSearchQuery
        ? 'Invoke WebRetrievalAdapter for genuine live HTTP web search and quarantine evidence with SHA-256 Merkle hashes.'
        : 'Cross-reference user input against verified knowledge graph nodes and grounding documentation.',
      confidence: 94,
      concerns: obs.uncertainty.missingContext.length > 0 ? ['Missing contextual details in query'] : [],
    });

    // 2. SecurityAgent
    opinions.push({
      specialistName: 'SecurityAgent',
      perspective: 'Sentinel hard governance, KMS key safety, and prompt boundary protection.',
      recommendation: `Enforce posture ${posture}; ensure capability tokens and HumanAuthorizationProof are validated for all state mutations and migration proposals.`,
      confidence: 98,
      concerns: posture !== 'NORMAL' ? [`Defensive posture elevated to ${posture}`] : [],
    });

    // 3. MemoryAgent
    opinions.push({
      specialistName: 'MemoryAgent',
      perspective: 'Longitudinal world graph, entity relations, and lineage receipts.',
      recommendation: 'Update entity graph with newly observed terms and maintain MemGate lineage consistency.',
      confidence: 90,
      concerns: [],
    });

    // 4. PlanningAgent
    const isMigrationQuery = lowerText.includes('migrat') || lowerText.includes('container') || lowerText.includes('north star') || lowerText.includes('deploy');
    opinions.push({
      specialistName: 'PlanningAgent',
      perspective: 'Goal decomposition, task execution sequences, and governed migration evaluation.',
      recommendation: isMigrationQuery
        ? 'Evaluate 9-point North Star Decision Test via GovernedMigrationEngine; enforce HumanAuthorizationProof gate.'
        : 'Map action steps directly to active Goal Engine tree; execute incrementally.',
      confidence: 93,
      concerns: [],
    });

    // 5. TeachingAgent
    opinions.push({
      specialistName: 'TeachingAgent',
      perspective: 'Clear, jargon-free user explanation, intuitive mental models, and step-by-step guidance.',
      recommendation: 'Provide concise, accessible explanations that highlight practical outcomes without cognitive overload.',
      confidence: 95,
      concerns: [],
    });

    // 6. Critic
    opinions.push({
      specialistName: 'Critic',
      perspective: 'Skepticism, anti-hallucination checks, and error prevention.',
      recommendation: 'Verify claim grounding before making permanent state writes or assertions.',
      confidence: 85,
      concerns: ['Ensure zero ungrounded state assertions are made.'],
    });

    // 7. Optimizer
    opinions.push({
      specialistName: 'Optimizer',
      perspective: 'Efficiency, response latency, and adaptive reasoning compute budget.',
      recommendation: 'Optimize execution pipeline to deliver fast, focused responses.',
      confidence: 91,
      concerns: [],
    });

    return opinions;
  }
}
