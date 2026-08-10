import { GoalItem, GoalStatus, ObservationEnvelopeVNext } from './types';

export class GoalEngine {
  private goals: GoalItem[] = [];

  constructor() {
    this.seedDefaultGoals();
  }

  private seedDefaultGoals() {
    const now = new Date().toISOString();

    this.goals = [
      {
        id: 'goal_vnext',
        title: 'Evolve Gabby into vNext Operating System',
        description: 'Implement Perception Bus, World Model, Goal Engine, Planner, Specialists, and Predictions.',
        status: 'ACTIVE',
        priority: 'CRITICAL',
        progressPercent: 65,
        createdTimestamp: now,
        updatedTimestamp: now,
        tags: ['Architecture', 'vNext', 'Autonomy'],
      },
      {
        id: 'subgoal_governance',
        parentId: 'goal_vnext',
        title: 'Maintain Sentinel Constitutional Governance',
        description: 'Ensure all vNext executions pass through KMS, CBAC, and Merkle ledger safety checks.',
        status: 'ACTIVE',
        priority: 'HIGH',
        progressPercent: 90,
        createdTimestamp: now,
        updatedTimestamp: now,
        tags: ['Sentinel', 'Safety'],
      },
      {
        id: 'subgoal_proactive',
        parentId: 'goal_vnext',
        title: 'Proactive Assistance Engine',
        description: 'Anticipate user needs and provide actionable suggestions before being asked.',
        status: 'ACTIVE',
        priority: 'HIGH',
        progressPercent: 70,
        createdTimestamp: now,
        updatedTimestamp: now,
        tags: ['Predictions', 'UX'],
      },
    ];
  }

  public updateGoalsFromObservation(obs: ObservationEnvelopeVNext) {
    const now = new Date().toISOString();
    const intent = obs.intentEstimate.primaryIntent;

    if (intent === 'DEBUG_AND_REPAIR') {
      const existing = this.goals.find((g) => g.title.includes('Bugfix') || g.title.includes('Repair'));
      if (!existing) {
        this.goals.unshift({
          id: `goal_${Date.now()}`,
          title: 'Resolve Active System Error / Defect',
          description: `User requested repair for input: "${obs.rawContent.substring(0, 60)}..."`,
          status: 'ACTIVE',
          priority: 'CRITICAL',
          progressPercent: 30,
          createdTimestamp: now,
          updatedTimestamp: now,
          tags: ['Repair', 'Fix'],
        });
      }
    } else if (obs.rawContent.toLowerCase().includes('done') || obs.rawContent.toLowerCase().includes('fixed')) {
      // Complete active repair goals
      this.goals.forEach((g) => {
        if (g.status === 'ACTIVE' && g.tags.includes('Repair')) {
          g.status = 'COMPLETED';
          g.progressPercent = 100;
          g.updatedTimestamp = now;
        }
      });
    }
  }

  public addGoal(title: string, description: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): GoalItem {
    const now = new Date().toISOString();
    const newGoal: GoalItem = {
      id: `goal_${Date.now()}`,
      title,
      description,
      status: 'ACTIVE',
      priority,
      progressPercent: 10,
      createdTimestamp: now,
      updatedTimestamp: now,
      tags: ['UserGoal'],
    };
    this.goals.unshift(newGoal);
    return newGoal;
  }

  public markGoalStatus(id: string, status: GoalStatus, progressPercent?: number) {
    const goal = this.goals.find((g) => g.id === id);
    if (goal) {
      goal.status = status;
      if (progressPercent !== undefined) goal.progressPercent = progressPercent;
      goal.updatedTimestamp = new Date().toISOString();
    }
  }

  public getActiveGoals(): GoalItem[] {
    return this.goals.filter((g) => g.status === 'ACTIVE' || g.status === 'SUBGOAL');
  }

  public getAllGoals(): GoalItem[] {
    return this.goals;
  }
}
