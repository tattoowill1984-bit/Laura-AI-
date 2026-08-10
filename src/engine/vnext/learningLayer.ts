import { WorldNode } from './types';

export class LearningLayer {
  public promoteKnowledge(nodes: WorldNode[]): WorldNode[] {
    const now = new Date().toISOString();

    nodes.forEach((node) => {
      if (node.verificationStage === 'TEMPORARY' && node.confidence > 70) {
        node.verificationStage = 'CANDIDATE';
        node.lastVerified = now;
      } else if (node.verificationStage === 'CANDIDATE' && node.confidence > 85) {
        node.verificationStage = 'VERIFIED';
        node.lastVerified = now;
      } else if (node.verificationStage === 'VERIFIED' && node.confidence >= 95) {
        node.verificationStage = 'CORE';
        node.lastVerified = now;
      }
    });

    return nodes;
  }
}
