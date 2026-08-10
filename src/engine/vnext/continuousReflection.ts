import { ReflectionEntry, ExecutionPlan } from './types';

export class ContinuousReflection {
  private reflections: ReflectionEntry[] = [];

  public logReflection(
    plan: ExecutionPlan,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS' = 'SUCCESS',
    surprises: string[] = [],
    missingKnowledge: string[] = []
  ): ReflectionEntry {
    const entry: ReflectionEntry = {
      id: `refl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      taskTitle: plan.title,
      outcome,
      surprises,
      missingKnowledgeIdentified: missingKnowledge,
      newPatternsDiscovered: ['Adaptive plan execution validated by Sentinel Kernel'],
      confidenceAdjustment: outcome === 'SUCCESS' ? 2 : -5,
      strategyLesson: outcome === 'SUCCESS' ? 'Goal decomposition matched user intent' : 'Replan needed for missing context',
    };

    this.reflections.unshift(entry);
    if (this.reflections.length > 30) this.reflections.pop();

    return entry;
  }

  public getRecentReflections(limit = 10): ReflectionEntry[] {
    return this.reflections.slice(0, limit);
  }
}
