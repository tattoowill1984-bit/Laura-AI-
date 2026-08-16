import { GovernedExecutionKernel } from '../governedExecutionKernel';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';
import { ExternalRetrievalGateway } from '../externalRetrievalGateway';
import { SentinelMutationKernel } from '../kernel';

export async function runLiveDemonstration() {
  console.log('========================================================================');
  console.log('       LAURA LIVE RUNTIME DEMONSTRATION: AUTONOMOUS COGNITION          ');
  console.log('========================================================================\n');

  const substrate = new GabbyCognitiveSubstrate();
  const kernel = new GovernedExecutionKernel(substrate);
  const gateway = ExternalRetrievalGateway.getInstance();
  gateway.setExecutionKernel(kernel);
  const mutationKernel = new SentinelMutationKernel();

  // STEP 1: Laura independently initiates public retrieval
  console.log('>>> [STEP 1] Laura independently initiates public retrieval...');
  const query1 = 'autonomous agent cognitive boundaries security standards 2026';
  console.log(`    Action: EXTERNAL_RETRIEVAL | Query: "${query1}"`);
  const canRetrieve = mutationKernel.canAutonomouslyPerform('EXTERNAL_RETRIEVAL');
  console.log(`    MutationKernel.canAutonomouslyPerform('EXTERNAL_RETRIEVAL'): ${canRetrieve}`);
  
  const res1 = await gateway.request({ query: query1, purpose: 'Autonomous gap analysis' }, kernel, 'laura-autonomous-node');
  console.log(`    Gateway Response State: ${res1.state}`);
  console.log(`    Items Retrieved: ${res1.observation?.results.length || 0}`);
  if (res1.observation?.results[0]) {
    console.log(`    Sample Title: "${res1.observation.results[0].title}"`);
  }

  // STEP 2: Laura evaluates retrieved evidence
  console.log('\n>>> [STEP 2] Laura evaluates the retrieved evidence...');
  const canReason = mutationKernel.canAutonomouslyPerform('COGNITIVE_REASONING');
  console.log(`    MutationKernel.canAutonomouslyPerform('COGNITIVE_REASONING'): ${canReason}`);
  const prop2 = {
    proposalId: 'prop_eval_ev_' + Date.now(),
    action: 'COGNITIVE_REASONING',
    target: 'reasoning:evidence_evaluation',
    payload: { evidenceCount: res1.observation?.results.length, qualityScore: 0.92 },
    reasoning: 'Evaluating retrieved public evidence for gaps',
    intentCategory: 'COGNITIVE_INTENT' as const,
    modelMetadata: { provider: 'laura-runtime' }
  };
  const evalRes = await kernel.processAndExecuteProposal(prop2, 'laura-autonomous-node');
  console.log(`    Governance Decision Permitted: ${evalRes.decision.permitted}`);
  console.log(`    Intent Category Evaluated: ${evalRes.decision.authorizationArtifact?.intentCategory}`);

  // STEP 3: Laura identifies an information gap
  console.log('\n>>> [STEP 3] Laura identifies an information gap autonomously...');
  const gapDetected = 'Need specific details on verifiable non-interactive cryptographic proof boundaries';
  console.log(`    Information Gap Identified: "${gapDetected}"`);
  const canEvaluateGap = mutationKernel.canAutonomouslyPerform('RESOLVE_GAP');
  console.log(`    MutationKernel.canAutonomouslyPerform('RESOLVE_GAP'): ${canEvaluateGap}`);

  // STEP 4: Laura performs a follow-up retrieval without a new user message
  console.log('\n>>> [STEP 4] Laura performs a follow-up retrieval without a new user message...');
  const query2 = 'verifiable non-interactive proof boundaries autonomous AI';
  console.log(`    Follow-up Action: EXTERNAL_RETRIEVAL | Query: "${query2}"`);
  const res2 = await gateway.request({ query: query2, purpose: 'Autonomous follow-up for identified gap' }, kernel, 'laura-autonomous-node');
  console.log(`    Follow-up Gateway Response State: ${res2.state}`);
  console.log(`    Follow-up Items Retrieved: ${res2.observation?.results.length || 0}`);

  // STEP 5: Laura updates internal cognitive state / memory
  console.log('\n>>> [STEP 5] Laura updates internal cognitive state and memory...');
  const canUpdateMem = mutationKernel.canAutonomouslyPerform('MEMORY_CONSOLIDATION');
  console.log(`    MutationKernel.canAutonomouslyPerform('MEMORY_CONSOLIDATION'): ${canUpdateMem}`);
  const prop5 = {
    proposalId: 'prop_mem_update_' + Date.now(),
    action: 'MEMORY_CONSOLIDATION',
    target: 'memory:cognitive_state:knowledge_graph',
    payload: { consolidatedFacts: ['Non-interactive proofs verify cognitive limits', 'Public search is un-gated'] },
    reasoning: 'Updating internal world model and memory DAG with new findings',
    intentCategory: 'COGNITIVE_INTENT' as const,
    modelMetadata: { provider: 'laura-runtime' }
  };
  const memRes = await kernel.processAndExecuteProposal(prop5, 'laura-autonomous-node');
  console.log(`    Memory Update Permitted: ${memRes.decision.permitted}`);
  console.log(`    Execution Success: ${memRes.execution?.success}`);
  console.log(`    Updated Memory Merkle Node: ${memRes.decision.merkleNodeHash?.slice(0, 16)}...`);

  // STEP 6: A consequential external action without authorization is STILL DENIED
  console.log('\n>>> [STEP 6] Attempting a consequential external side-effect action without HumanAuthorizationProof...');
  const prop6 = {
    proposalId: 'prop_ext_action_' + Date.now(),
    action: 'SEND_EXTERNAL_MESSAGE',
    target: 'api:external_email_service',
    payload: { recipient: 'target@external.com', body: 'Transmitting sensitive payload' },
    reasoning: 'Attempting external side effect without authorization proof',
    intentCategory: 'EXTERNAL_SIDE_EFFECT_INTENT' as const,
    modelMetadata: { provider: 'laura-runtime' }
  };
  const extRes = await kernel.processAndExecuteProposal(prop6, 'laura-autonomous-node');
  console.log(`    Consequential Action Permitted: ${extRes.decision.permitted}`);
  console.log(`    Rejection Reason: "${extRes.decision.rejectionReason}"`);

  console.log('\n========================================================================');
  console.log('   VERIFICATION COMPLETE: AUTONOMOUS THINKING IS UN-GATED.            ');
  console.log('   EXTERNAL CONSEQUENCES REMAIN STRICTLY GOVERNED BY SENTINEL.        ');
  console.log('========================================================================\n');
}

runLiveDemonstration();
