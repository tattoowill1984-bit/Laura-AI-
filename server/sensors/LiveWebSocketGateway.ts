import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { gabbyVNextEngine } from '../../src/engine/vnext';
import { SentinelMutationKernel } from '../../src/engine/kernel';

export class LiveWebSocketGateway {
  private wss: WebSocketServer | null = null;
  private kernel: SentinelMutationKernel;

  constructor(kernel: SentinelMutationKernel) {
    this.kernel = kernel;
  }

  public attach(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws/sensors' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[LiveWebSocketGateway] Sensor client connected via WebSocket.');

      ws.on('message', (message: string | Buffer) => {
        try {
          const rawText = message.toString();
          const payload = JSON.parse(rawText);

          this.processIncomingSensorPayload(payload, (response) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(response));
            }
          });
        } catch (err) {
          console.warn('[LiveWebSocketGateway] Error processing socket payload:', err);
        }
      });

      ws.on('close', () => {
        console.log('[LiveWebSocketGateway] Sensor client disconnected.');
      });
    });

    console.log('[LiveWebSocketGateway] Real-Time Sensor Stream Gateway listening on /ws/sensors');
  }

  public processIncomingSensorPayload(payload: any, replyCallback?: (data: any) => void) {
    const { type, frameBase64, frame, visualData, audioData, timestamp, source, temporal_anchor, temporalAnchor } = payload || {};

    const activeTemporalAnchor = temporal_anchor || temporalAnchor || {
      timestamp: timestamp || new Date().toISOString(),
      delta_t_ms: payload?.delta_t_ms ?? 1000,
      delta_since_last_frame_sec: payload?.delta_since_last_frame_sec ?? 1.0,
      local_time: payload?.local_time,
      diurnal_context: payload?.diurnal_context,
      is_static_scene: payload?.is_static_scene ?? false,
      motion_energy_score: payload?.motion_energy_score ?? 0,
    };

    let modality: 'CAMERA' | 'MICROPHONE' | 'TEXT' = 'TEXT';
    let rawContent = 'Continuous background stream observation';

    if (type === 'CONTINUOUS_CAMERA_FRAME' || effectiveFrame) {
      modality = 'CAMERA';
      rawContent = '[CONTINUOUS_CAMERA_FRAME_SAMPLED]';
      this.kernel.getGabbySubstrate().guard.updateVisualPresence({
        isCameraActive: true,
        confidenceScore: 92,
        operatorName: 'Will',
        lastVerifiedTs: activeTemporalAnchor.timestamp || new Date().toISOString(),
        visualAnchorDetails: 'Continuous camera stream frame ingested via LiveWebSocketGateway',
      });
    } else if (type === 'CONTINUOUS_AUDIO_CHUNK') {
      modality = 'MICROPHONE';
      rawContent = '[CONTINUOUS_AUDIO_CHUNK_SAMPLED]';
    } else if (payload.message) {
      rawContent = payload.message;
    }

    const effectiveFrame = frameBase64 || frame;

    // 1. Ingest into PerceptionBus -> Envelopes created & governed with Temporal Anchor
    const currentPosture = this.kernel.getPosture();
    const turnResult = gabbyVNextEngine.processTurn(
      rawContent,
      currentPosture,
      modality,
      source || 'LIVE_SENSOR_GATEWAY',
      effectiveFrame ? 1 : 0,
      visualData,
      audioData,
      activeTemporalAnchor
    );

    // 2. Audit & Governance Logging without mutating permanent memory
    this.kernel.getGabbySubstrate().recordObservationAndVerify(
      `Gateway Ingested ${modality} envelope [id=${turnResult.observation.id}]`,
      0.95
    );

    const learnerState = turnResult.learnerState;
    const multimodalState = learnerState.multimodalState;

    const responseObj = {
      type: 'TELEMETRY_UPDATE',
      observationId: turnResult.observation.id,
      timestamp: timestamp || new Date().toISOString(),
      modality: turnResult.observation.modality,
      multimodalUserContext: multimodalState,
      temporalState: learnerState.temporalState,
      temporalObs: turnResult.temporalObs,
      temporalWindow: turnResult.temporalWindow,
      humanCommunicationString: turnResult.humanCommunicationString,
      activeStrategy: learnerState.strategy.primaryStrategy,
      confidenceScore: multimodalState.confidence,
      governanceStatus: 'GOVERNED_TRANSIENT_ENVELOPE',
      evidence: [
        `Modality: ${modality}`,
        `Frustration Prob: ${multimodalState.frustrationProbability}%`,
        `Confusion Prob: ${multimodalState.confusionProbability}%`,
        `Uncertainty Prob: ${multimodalState.uncertaintyProbability}%`,
        `Engagement Prob: ${multimodalState.engagementProbability}%`,
      ],
    };

    if (replyCallback) {
      replyCallback(responseObj);
    }

    return responseObj;
  }
}
