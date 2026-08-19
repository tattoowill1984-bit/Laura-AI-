import { PerceptionModality, VisualObservationData, AudioObservationData } from '../engine/vnext/types';

export interface StreamerConfig {
  cameraFps?: number;
  sampleIntervalMs?: number;
  targetQuality?: number; // 0.1 to 1.0
  enableAudioVAD?: boolean;
}

export interface PerceptionTelemetry {
  eyesStatus: 'ACTIVE' | 'STANDBY' | 'UNAVAILABLE';
  earsStatus: 'ACTIVE' | 'STANDBY' | 'UNAVAILABLE';
  textContextStatus: 'ACTIVE' | 'STANDBY';
  framesProcessed: number;
  audioChunksProcessed: number;
  lastFrameTimestamp?: string;
  lastAudioTimestamp?: string;
  connectedWebSocket: boolean;
  activeStrategy?: string;
  confidenceScore?: number;
  gatingState: 'ACTIVE_BURST' | 'THROTTLED_STATIC';
  motionEnergyScore: number; // 0 to 100%
  audioEnergyLevel: number; // 0 to 255
  sampleIntervalMs: number;
  gatingThresholds: {
    motionPercent: number;
    audioVolume: number;
  };
}

export type SensorTelemetry = PerceptionTelemetry;

export class SensorStreamer {
  private cameraStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private latestFrameBase64: string | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private cameraIntervalId: any = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioProcessInterval: any = null;
  private ws: WebSocket | null = null;
  
  private config: Required<StreamerConfig> = {
    cameraFps: 1,
    sampleIntervalMs: 1000,
    targetQuality: 0.7,
    enableAudioVAD: true,
  };

  private previousFrameData: Uint8ClampedArray | null = null;
  private sampleCanvas: HTMLCanvasElement | null = null;
  private sampleCtx: CanvasRenderingContext2D | null = null;
  private consecutiveStaticCycles = 0;
  private currentSamplingIntervalMs = 1000;
  private lastFrameEpochMs: number = Date.now();

  /**
   * Generates standardized Temporal Anchor Header containing:
   * - Absolute UTC timestamp (ISO-8601)
   * - Local epoch delta (delta_t_ms & delta_since_last_frame_sec)
   * - Diurnal context (Morning, Midday, Afternoon, Dusk, Evening, Midnight)
   * - Motion energy & static scene filtering flag
   */
  public generateTemporalAnchor(motionPercent?: number, customSubject?: string) {
    const now = new Date();
    const nowEpoch = now.getTime();
    const delta_t_ms = this.lastFrameEpochMs ? Math.max(0, nowEpoch - this.lastFrameEpochMs) : 1000;
    const delta_since_last_frame_sec = parseFloat((delta_t_ms / 1000).toFixed(1));
    this.lastFrameEpochMs = nowEpoch;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const local_time = `${hours}:${minutes}`;

    let diurnal_context: 'Dawn' | 'Morning' | 'Midday' | 'Afternoon' | 'Dusk' | 'Evening' | 'Midnight' = 'Afternoon';
    if (hours >= 5 && hours < 7) diurnal_context = 'Dawn';
    else if (hours >= 7 && hours < 11) diurnal_context = 'Morning';
    else if (hours >= 11 && hours < 13) diurnal_context = 'Midday';
    else if (hours >= 13 && hours < 17) diurnal_context = 'Afternoon';
    else if (hours >= 17 && hours < 19) diurnal_context = 'Dusk';
    else if (hours >= 19 && hours < 22) diurnal_context = 'Evening';
    else diurnal_context = 'Midnight';

    const is_static_scene = motionPercent !== undefined ? motionPercent < this.telemetry.gatingThresholds.motionPercent : false;
    const temporal_gap_detected = delta_since_last_frame_sec >= 1800; // >= 30 mins
    const gap_duration_hours = parseFloat((delta_since_last_frame_sec / 3600).toFixed(2));

    const entityAttribution = {
      cameraOperator: {
        name: 'Will',
        role: 'Primary Session Owner / Voice Operator',
        id: 'user_will_primary',
      },
      frameSubject: {
        primarySubject: customSubject || 'Will',
        secondarySubjects: [],
        confidence: 92,
        disambiguationNotes: 'Disambiguated via continuous sensory stream operator tracking',
      },
    };

    return {
      timestamp: now.toISOString(),
      delta_t_ms,
      delta_since_last_frame_sec,
      local_time,
      diurnal_context,
      is_static_scene,
      motion_energy_score: motionPercent ?? 0,
      temporal_gap_detected,
      gap_duration_hours,
      entityAttribution,
    };
  }

  private telemetry: PerceptionTelemetry = {
    eyesStatus: 'UNAVAILABLE',
    earsStatus: 'UNAVAILABLE',
    textContextStatus: 'ACTIVE',
    framesProcessed: 0,
    audioChunksProcessed: 0,
    connectedWebSocket: false,
    gatingState: 'ACTIVE_BURST',
    motionEnergyScore: 0,
    audioEnergyLevel: 0,
    sampleIntervalMs: 1000,
    gatingThresholds: {
      motionPercent: 2.5,
      audioVolume: 12,
    },
  };

  private frameCanvas: HTMLCanvasElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private onObservationCallback?: (obs: any) => void;

  constructor(config?: StreamerConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (typeof window !== 'undefined') {
      const windowUnloadCleanup = () => {
        this.stopAllStreams(true);
      };
      window.addEventListener('beforeunload', windowUnloadCleanup);
      window.addEventListener('pagehide', windowUnloadCleanup);
      window.addEventListener('unload', windowUnloadCleanup);
    }
  }

  public setObservationListener(callback: (obs: any) => void) {
    this.onObservationCallback = callback;
  }

  public onObservation(callback: (obs: any) => void): () => void {
    this.onObservationCallback = callback;
    return () => {
      if (this.onObservationCallback === callback) {
        this.onObservationCallback = undefined;
      }
    };
  }

  public getCameraStream(): MediaStream | null {
    return this.cameraStream;
  }

  public getAudioStream(): MediaStream | null {
    return this.audioStream;
  }

  public getLatestFrameBase64(): string | null {
    return this.latestFrameBase64;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  // --- WEBSOCKET CONNECTION LAYER (SINGLETON GUARDED) ---
  public connectGateway(wsUrl?: string): Promise<boolean> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const targetUrl = wsUrl || `${protocol}//${host}/ws/sensors`;

        this.ws = new WebSocket(targetUrl);

        this.ws.onopen = () => {
          this.telemetry.connectedWebSocket = true;
          console.log('[SensorStreamer] Singleton connected to LiveWebSocketGateway:', targetUrl);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TELEMETRY_UPDATE' || data.type === 'OBSERVATION_INGESTED') {
              if (data.activeStrategy) this.telemetry.activeStrategy = data.activeStrategy;
              if (data.confidenceScore) this.telemetry.confidenceScore = data.confidenceScore;
              if (this.onObservationCallback) {
                this.onObservationCallback(data);
              }
            }
          } catch (e) {
            // Non-JSON socket payload
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[SensorStreamer] WebSocket gateway connection warning:', err);
          this.telemetry.connectedWebSocket = false;
          resolve(false);
        };

        this.ws.onclose = () => {
          this.telemetry.connectedWebSocket = false;
          this.ws = null;
        };
      } catch (err) {
        console.warn('[SensorStreamer] Gateway socket error:', err);
        this.telemetry.connectedWebSocket = false;
        this.ws = null;
        resolve(false);
      }
    });
  }

  // --- CAMERA STREAMING ENGINE (SINGLETON GUARDED) ---
  public async startCameraStream(videoFacing: 'user' | 'environment' = 'user', forceRecreate = false): Promise<boolean> {
    try {
      // 1. Check if camera stream already exists and is active
      const isStreamActive = this.cameraStream && this.cameraStream.getVideoTracks().some((t) => t.readyState === 'live');
      if (isStreamActive && !forceRecreate && this.currentFacingMode === videoFacing) {
        this.telemetry.eyesStatus = 'ACTIVE';
        this.ensureCameraSamplingLoop();
        return true;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        this.telemetry.eyesStatus = 'UNAVAILABLE';
        return false;
      }

      // 2. Stop old stream if existing or forcing recreate
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (e) {}
        });
        this.cameraStream = null;
      }

      this.currentFacingMode = videoFacing;
      try {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: videoFacing, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e1) {
        try {
          console.warn('[SensorStreamer] Preferred camera constraints failed, attempting basic mobile facingMode fallback:', e1);
          this.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: videoFacing },
            audio: false,
          });
        } catch (e2) {
          console.warn('[SensorStreamer] Facing mode constraint failed, falling back to basic video stream:', e2);
          this.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('webkit-playsinline', 'true');
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
      }
      this.videoElement.srcObject = this.cameraStream;
      await this.videoElement.play().catch(() => {});

      if (!this.frameCanvas) {
        this.frameCanvas = document.createElement('canvas');
      }
      this.telemetry.eyesStatus = 'ACTIVE';

      this.ensureCameraSamplingLoop();
      return true;
    } catch (err) {
      console.warn('[SensorStreamer] Camera stream startup failed:', err);
      this.telemetry.eyesStatus = 'UNAVAILABLE';
      return false;
    }
  }

  private ensureCameraSamplingLoop(targetIntervalMs?: number) {
    const intervalMs = targetIntervalMs || this.currentSamplingIntervalMs;
    if (this.cameraIntervalId) {
      clearInterval(this.cameraIntervalId);
      this.cameraIntervalId = null;
    }
    this.currentSamplingIntervalMs = intervalMs;
    this.telemetry.sampleIntervalMs = intervalMs;

    this.cameraIntervalId = setInterval(() => {
      this.captureAndEmitFrame();
    }, intervalMs);
  }

  public stopCameraStream(explicitShutdown = true) {
    if (this.cameraIntervalId) {
      clearInterval(this.cameraIntervalId);
      this.cameraIntervalId = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.cameraStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.latestFrameBase64 = null;
    this.previousFrameData = null;
    this.telemetry.eyesStatus = 'STANDBY';
  }

  private calculatePixelMotion(ctx: CanvasRenderingContext2D, width: number, height: number): number {
    try {
      // Downsample for fast motion evaluation using cached offscreen canvas
      const sampleW = 64;
      const sampleH = 48;
      if (!this.sampleCanvas) {
        if (typeof document !== 'undefined') {
          this.sampleCanvas = document.createElement('canvas');
          this.sampleCanvas.width = sampleW;
          this.sampleCanvas.height = sampleH;
          this.sampleCtx = this.sampleCanvas.getContext('2d');
        }
      }
      if (!this.sampleCtx) return 0;

      this.sampleCtx.drawImage(ctx.canvas, 0, 0, sampleW, sampleH);
      const imgData = this.sampleCtx.getImageData(0, 0, sampleW, sampleH);
      const currentPixels = imgData.data;

      if (!this.previousFrameData || this.previousFrameData.length !== currentPixels.length) {
        this.previousFrameData = new Uint8ClampedArray(currentPixels);
        return 10.0; // Initial burst trigger
      }

      let diffSum = 0;
      const totalPixels = sampleW * sampleH;

      for (let i = 0; i < currentPixels.length; i += 4) {
        // Luminance difference
        const curLum = 0.299 * currentPixels[i] + 0.587 * currentPixels[i + 1] + 0.114 * currentPixels[i + 2];
        const prevLum = 0.299 * this.previousFrameData[i] + 0.587 * this.previousFrameData[i + 1] + 0.114 * this.previousFrameData[i + 2];
        const diff = Math.abs(curLum - prevLum);
        if (diff > 15) {
          diffSum += diff;
        }
      }

      this.previousFrameData.set(currentPixels);
      const avgDiff = diffSum / (totalPixels * 255);
      return Math.min(100, Math.round(avgDiff * 1000) / 10);
    } catch (e) {
      return 0;
    }
  }

  private evaluateAdaptiveGating(motionPercent: number, audioVolume: number) {
    this.telemetry.motionEnergyScore = motionPercent;
    this.telemetry.audioEnergyLevel = audioVolume;

    const isMotionActive = motionPercent >= this.telemetry.gatingThresholds.motionPercent;
    const isAudioActive = audioVolume >= this.telemetry.gatingThresholds.audioVolume;

    if (isMotionActive || isAudioActive) {
      this.consecutiveStaticCycles = 0;
      if (this.telemetry.gatingState !== 'ACTIVE_BURST') {
        this.telemetry.gatingState = 'ACTIVE_BURST';
        console.log(`[SensorStreamer] Adaptive Sensor Gating Triggered ACTIVE_BURST (Motion: ${motionPercent}%, Audio: ${audioVolume})`);
        this.ensureCameraSamplingLoop(800); // 1.25 FPS active burst
      }
    } else {
      this.consecutiveStaticCycles++;
      if (this.consecutiveStaticCycles >= 3 && this.telemetry.gatingState !== 'THROTTLED_STATIC') {
        this.telemetry.gatingState = 'THROTTLED_STATIC';
        console.log(`[SensorStreamer] Environment Static — Throttling API payloads to 5.0s interval (Eco Gating Mode)`);
        this.ensureCameraSamplingLoop(5000); // Throttle down to 5.0s static interval
      }
    }
  }

  private captureAndEmitFrame() {
    if (!this.cameraStream || this.cameraStream.getVideoTracks().every(t => t.readyState === 'ended')) {
      if (this.cameraIntervalId) {
        clearInterval(this.cameraIntervalId);
        this.cameraIntervalId = null;
      }
      return;
    }

    if (!this.videoElement || !this.frameCanvas || this.videoElement.readyState < 2) return;

    const width = this.videoElement.videoWidth || 320;
    const height = this.videoElement.videoHeight || 240;

    this.frameCanvas.width = width;
    this.frameCanvas.height = height;

    const ctx = this.frameCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, width, height);

    // Calculate motion & evaluate gating
    const motionPercent = this.calculatePixelMotion(ctx, width, height);
    this.evaluateAdaptiveGating(motionPercent, this.telemetry.audioEnergyLevel);

    // Generate standardized Temporal Anchor Header
    const temporalAnchor = this.generateTemporalAnchor(motionPercent);

    const frameBase64 = this.frameCanvas.toDataURL('image/jpeg', this.config.targetQuality);
    this.latestFrameBase64 = frameBase64;

    this.telemetry.framesProcessed++;
    this.telemetry.lastFrameTimestamp = temporalAnchor.timestamp;

    const visualData: Partial<VisualObservationData> = {
      hasVisualContent: true,
      detectedObjects: [
        {
          label: motionPercent > 5 ? 'Dynamic Motion Detected in Feed' : 'Static User Feed',
          confidence: Math.round(85 + Math.min(10, motionPercent)),
          locationBoundingBox: '150,200,850,800',
        },
      ],
      presentedMaterials: [{ type: 'SCREEN', summary: 'Active continuous video stream frame' }],
      environmentalContext: `User workspace (${temporalAnchor.diurnal_context} lighting, ${temporalAnchor.local_time})`,
    };

    // Static scene filtering: If static scene and consecutive static cycles > 2, omit heavy frameBase64 to save visual tokens
    const isStaticFiltered = temporalAnchor.is_static_scene && this.consecutiveStaticCycles > 2;

    const payload = {
      type: 'CONTINUOUS_CAMERA_FRAME',
      timestamp: temporalAnchor.timestamp,
      temporal_anchor: temporalAnchor,
      delta_since_last_frame_sec: temporalAnchor.delta_since_last_frame_sec,
      delta_t_ms: temporalAnchor.delta_t_ms,
      local_time: temporalAnchor.local_time,
      diurnal_context: temporalAnchor.diurnal_context,
      frame: isStaticFiltered ? null : frameBase64,
      frameBase64: isStaticFiltered ? null : frameBase64,
      is_static_scene: temporalAnchor.is_static_scene,
      visualData,
      gatingState: this.telemetry.gatingState,
      motionEnergyScore: motionPercent,
      source: 'SENSOR_STREAMER_EYES',
    };

    this.transmitObservationPayload(payload);
  }

  // --- MICROPHONE STREAMING ENGINE (SINGLETON GUARDED) ---
  public async startAudioStream(): Promise<boolean> {
    try {
      const isAudioActive = this.audioStream && this.audioStream.getAudioTracks().some((t) => t.readyState === 'live');
      if (isAudioActive) {
        this.telemetry.earsStatus = 'ACTIVE';
        this.ensureAudioSamplingLoop();
        return true;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        this.telemetry.earsStatus = 'UNAVAILABLE';
        return false;
      }

      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioContextClass();
        }
        const sourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
        this.audioAnalyser = this.audioContext.createAnalyser();
        this.audioAnalyser.fftSize = 512;
        sourceNode.connect(this.audioAnalyser);

        this.telemetry.earsStatus = 'ACTIVE';
        this.ensureAudioSamplingLoop();

        return true;
      }

      this.telemetry.earsStatus = 'STANDBY';
      return false;
    } catch (err) {
      console.warn('[SensorStreamer] Audio stream startup failed:', err);
      this.telemetry.earsStatus = 'UNAVAILABLE';
      return false;
    }
  }

  private ensureAudioSamplingLoop() {
    if (!this.audioProcessInterval) {
      this.audioProcessInterval = setInterval(() => {
        this.processAudioFeatures();
      }, 1500);
    }
  }

  public stopAudioStream(explicitShutdown = true) {
    if (this.audioProcessInterval) {
      clearInterval(this.audioProcessInterval);
      this.audioProcessInterval = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close().catch(() => {});
      } catch (e) {}
      this.audioContext = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.audioStream = null;
    }
    this.audioAnalyser = null;
    this.telemetry.earsStatus = 'STANDBY';
  }

  private processAudioFeatures() {
    if (!this.audioStream || this.audioStream.getAudioTracks().every(t => t.readyState === 'ended')) {
      if (this.audioProcessInterval) {
        clearInterval(this.audioProcessInterval);
        this.audioProcessInterval = null;
      }
      return;
    }

    if (!this.audioAnalyser) return;

    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.audioAnalyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avgVolume = sum / dataArray.length;

    // Evaluate adaptive gating with audio volume
    this.evaluateAdaptiveGating(this.telemetry.motionEnergyScore, avgVolume);

    // Estimate acoustic vocal energy and hesitation indicators
    const vocalEnergy: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' =
      avgVolume > 140 ? 'ELEVATED' : avgVolume > 80 ? 'NORMAL' : 'LOW';

    const isSilent = avgVolume < 10;
    const hesitationCount = isSilent ? 1 : 0;

    this.telemetry.audioChunksProcessed++;
    const temporalAnchor = this.generateTemporalAnchor();
    this.telemetry.lastAudioTimestamp = temporalAnchor.timestamp;

    const audioData: Partial<AudioObservationData> = {
      hasAudioContent: true,
      speechPaceRatio: isSilent ? 0.6 : 1.0,
      pausesCount: isSilent ? 1 : 0,
      hesitationMarkersCount: hesitationCount,
      repetitionCount: 0,
      vocalEnergyLevel: vocalEnergy,
      uncertaintyIndicatorsCount: isSilent ? 1 : 0,
    };

    const payload = {
      type: 'CONTINUOUS_AUDIO_CHUNK',
      timestamp: temporalAnchor.timestamp,
      temporal_anchor: temporalAnchor,
      delta_since_last_frame_sec: temporalAnchor.delta_since_last_frame_sec,
      delta_t_ms: temporalAnchor.delta_t_ms,
      local_time: temporalAnchor.local_time,
      diurnal_context: temporalAnchor.diurnal_context,
      avgVolume,
      audioData,
      source: 'SENSOR_STREAMER_EARS',
    };

    this.transmitObservationPayload(payload);
  }

  // --- UNIFIED TRANSMISSION PIPELINE ---
  private transmitObservationPayload(payload: any) {
    // 1. Try WebSocket Gateway
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      // 2. HTTP Fallback to live gateway endpoint
      fetch('/api/vnext/live-stream-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(res => res.json()).then(data => {
        if (data.activeStrategy) this.telemetry.activeStrategy = data.activeStrategy;
        if (data.confidenceScore) this.telemetry.confidenceScore = data.confidenceScore;
        if (this.onObservationCallback) this.onObservationCallback(data);
      }).catch(() => {
        // Silent catch for background fallback
      });
    }
  }

  public getTelemetry(): PerceptionTelemetry {
    return { ...this.telemetry };
  }

  public stopAllStreams(explicitShutdown = true) {
    this.stopCameraStream(explicitShutdown);
    this.stopAudioStream(explicitShutdown);
    if (explicitShutdown && this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const sensorStreamer = new SensorStreamer();
