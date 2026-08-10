import { ExecutionPlan, ExecutionPlanStep, ReasoningTier, ObservationEnvelopeVNext, GoalItem } from './types';

export class ActivePlannerExecutionKernel {
  public createAndSimulatePlan(
    obs: ObservationEnvelopeVNext,
    tier: ReasoningTier,
    activeGoals: GoalItem[]
  ): ExecutionPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const steps: ExecutionPlanStep[] = [
      {
        stepNumber: 1,
        phase: 'OBSERVE',
        actionTitle: 'Standardize Observation Envelope',
        description: `Ingested input via PerceptionBus (${obs.modality}, ${obs.source}).`,
        status: 'COMPLETED',
        specialistAssigned: 'ResearchAgent',
        resultSummary: `Entities: ${obs.extractedEntities.map((e) => e.name).join(', ') || 'None'}`,
      },
      {
        stepNumber: 2,
        phase: 'UNDERSTAND',
        actionTitle: 'Query World Model & Goal Engine',
        description: `Synthesize context from World Model graph and align with ${activeGoals.length} active goals.`,
        status: 'COMPLETED',
        specialistAssigned: 'MemoryAgent',
        resultSummary: 'Context aligned with primary user goal.',
      },
      {
        stepNumber: 3,
        phase: 'PLAN',
        actionTitle: 'Formulate Execution Trajectory',
        description: 'Formulate action sequence with adaptive reasoning budget.',
        status: 'IN_PROGRESS',
        specialistAssigned: 'PlanningAgent',
      },
      {
        stepNumber: 4,
        phase: 'SIMULATE',
        actionTitle: 'Simulate Risk & Sentinel Boundary Check',
        description: 'Validate capability token and policy invariants in substrate governor sandbox.',
        status: 'PENDING',
        specialistAssigned: 'SecurityAgent',
      },
      {
        stepNumber: 5,
        phase: 'EXECUTE',
        actionTitle: 'Execute Synthesized Response / Capability Call',
        description: 'Run LLM synthesis / skill execution with Sentinel Merkle Node commit.',
        status: 'PENDING',
        specialistAssigned: 'Optimizer',
      },
      {
        stepNumber: 6,
        phase: 'EVALUATE',
        actionTitle: 'Evaluate Outcome & Verify Grounding',
        description: 'Check output against Critic invariants and user intent satisfaction.',
        status: 'PENDING',
        specialistAssigned: 'Critic',
      },
      {
        stepNumber: 7,
        phase: 'REFLECT',
        actionTitle: 'Continuous Reflection & Strategy Update',
        description: 'Record reflection entry and promote candidate knowledge in learning layer.',
        status: 'PENDING',
        specialistAssigned: 'TeachingAgent',
      },
    ];

    return {
      id: planId,
      title: `Execution Trajectory for Intent: ${obs.intentEstimate.primaryIntent}`,
      steps,
      currentStepIndex: 2,
      adaptiveReasoningTier: tier,
      simulatedRiskScore: obs.uncertainty.score > 50 ? 35 : 10,
      status: 'EXECUTING',
    };
  }

  public advancePlan(plan: ExecutionPlan, stepIndex: number, resultSummary: string): ExecutionPlan {
    if (plan.steps[stepIndex]) {
      plan.steps[stepIndex].status = 'COMPLETED';
      plan.steps[stepIndex].resultSummary = resultSummary;
      plan.currentStepIndex = stepIndex + 1;

      if (plan.currentStepIndex < plan.steps.length) {
        plan.steps[plan.currentStepIndex].status = 'IN_PROGRESS';
      } else {
        plan.status = 'COMPLETED';
      }
    }
    return plan;
  }
}
