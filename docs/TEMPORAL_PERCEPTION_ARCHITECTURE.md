# Gabby AI — Temporal Perception & Context Integration Layer

> **Disclaimer**: This Temporal Perception & Context Integration system is an engineering architecture design inspired by neuroscience research on postdiction and temporal binding in perception. It is **NOT** a claim that Gabby possesses human consciousness or that Gabby's processing is biologically equivalent to the human brain.

---

## 1. Core Principles & Architecture

### Invariant Equations:
- $\text{OBSERVATION} \neq \text{INTERPRETATION}$
- $\text{PRELIMINARY INTERPRETATION} \neq \text{FINAL UNDERSTANDING}$

### Key Design Goals:
1. **Immutable Raw Sensory Records**: Raw observations (e.g. video frames, audio chunks, speech transcriptions) remain immutable once ingested.
2. **Provisional Ingestion**: Observations start as provisional (`isProvisional = true`, `status = 'OBSERVED' | 'PROVISIONAL'`) and are **not** automatically promoted to durable long-term memory.
3. **Temporal Binding Windows**: Related nearby observations across modalities (Camera, Microphone, Speech, Text, Environmental Sensors, Tool Results) are grouped into bounded `TemporalPerceptionWindow` structures (default duration: 30,000ms).
4. **Postdiction-Inspired Retrospective Context Revision**: Later evidence within a temporal sequence can revise the interpretation of an earlier observation without altering the original raw sensory reference.
5. **Remember Without Obeying**: Stored long-term memory provides context for interpretation, but current sensory evidence is never overridden by prior memory. Contradictions trigger uncertainty and investigation.

---

## 2. Temporal States Lifecycle

```
 +------------------+       Sequence Grouping       +---------------------+
 |  OBSERVED (Raw)  | ----------------------------> |     INTEGRATING     |
 +------------------+                               +---------------------+
          |                                                    |
          |  Clarification / Sequence                          | Convergent Evidence
          v                                                    v
 +------------------+                               +---------------------+
 |     REVISED      | <---------------------------- |       STABLE        |
 +------------------+        New Evidence           +---------------------+
          |                                                    |
          | Timeout without commit                             | User / Agent Commit
          v                                                    v
 +------------------+                               +---------------------+
 |     EXPIRED      |                               |      COMMITTED      |
 +------------------+                               +---------------------+
```

- **`OPEN`**: Temporal window initialized; awaiting incoming observations.
- **`INTEGRATING`**: Multi-frame visual/audio or conversational sequence being active combined.
- **`UNCERTAIN`**: Multiple plausible interpretations remain open; triggers natural conversational uncertainty phrasing.
- **`STABLE`**: Convergent evidence across modalities supports integrated understanding.
- **`REVISED`**: Postdiction revision updated an earlier preliminary interpretation.
- **`COMMITTED`**: Understanding promoted to durable long-term memory in WorldModel.
- **`EXPIRED`**: Window closed after timeout threshold (30s–60s) without durable commit.

---

## 3. Data Flow Architecture

```
Continuously Streaming Sensors (Camera / Mic / Chat)
        │
        ▼
Multimodal Perception Bus (`perceptionBus.ts`)
  ├─ Raw Sensory Extraction & Temporal Anchors
  └─ Initial Envelope Generation
        │
        ▼
Temporal Perception Layer (`temporalPerception.ts`)
  ├─ Evaluates Attention Escalation (LOW | MODERATE | HIGH | HIGH_UNCERTAINTY | SAFETY_RELEVANT)
  ├─ Groups Envelopes into TemporalPerceptionWindow
  ├─ Integrates Visual Sequences (Frames 1..N) & Audio Sequences
  ├─ Postdiction Context Revision (Original Raw Data Unchanged)
  └─ Format Natural Conversational Phrasing ("I'm not quite sure yet...")
        │
        ▼
Epistemic Alignment & Prediction Engine (`predictionEngine.ts` / `worldModel.ts`)
  ├─ Prediction Error / Surprise Measurement
  ├─ Escalates Attention on High Surprise
  └─ Syncs Confidence Bounds & Cognitive Entropy
```

---

## 4. Observation vs. Interpretation vs. Understanding vs. Memory

| Layer | Definition | Storage | Immutability |
| :--- | :--- | :--- | :--- |
| **Observation** | What the physical sensors actually detected at time $t$ | `rawObservationRef` | **Strictly Immutable** |
| **Preliminary Interpretation** | Initial immediate inference before sequence completion | `preliminaryInterpretation` | Mutable via Revision Lineage |
| **Integrated Understanding** | Synthesized understanding across temporal window sequence | `integratedUnderstanding` | Evolving over Window |
| **Durable Memory** | Intentionally retained knowledge promoted to WorldModel | `WorldModel` Nodes | Governed with Provenance |

---

## 5. Revision Lineage Tracking

When an earlier interpretation is revised via postdiction context, complete memory lineage is preserved in `revisionHistory`:

```json
{
  "timestamp": "2026-08-07T11:40:00Z",
  "previousInterpretation": "Will raised his hand.",
  "revisedInterpretation": "Will raised his hand as part of reaching for an object.",
  "reasonForRevision": "Later frames (Frame 3 & 4) revealed an object being picked up.",
  "supportingEvidenceIds": ["cam_seq_2", "cam_seq_3"],
  "confidence": 92
}
```

---

## 6. Prediction Error & Attention Escalation

Attention allocation is dynamically modulated:

- **`LOW`**: Redundant static camera frames or silent audio; observations are compressed (`compressed = true`) while preserving provenance.
- **`MODERATE`**: Standard active interaction; 30-second window.
- **`HIGH`**: Multi-modal active sequences (active camera movement or voice speech).
- **`HIGH_UNCERTAINTY`**: Triggered when prediction error delta $> 0.60$ or high hesitation markers; extends temporal window to 60 seconds and prompts for clarification.
- **`SAFETY_RELEVANT`**: Triggered by critical fault/security terms; bypasses compression and prioritizes immediate processing under existing safety governance rules.

---

## 7. Performance Considerations & Failure Modes

- **Performance**: Static camera feeds use local motion score checks to assign `LOW` attention tier, avoiding expensive redundant cloud model calls.
- **Failure Modes & Graceful Degradation**:
  - *Camera/Mic Unavailable*: System operates in text/log mode without fabricating synthetic perceptions.
  - *Window Timeout*: Uncommitted windows automatically transition to `EXPIRED` without polluting durable memory.
  - *Governance*: Revision of interpretations NEVER bypasses authorization controls (Capability $\neq$ Authorization, Observation $\neq$ Permission).

---

## 8. Verification & Testing Strategy

The system is validated by a 15-scenario automated verification suite in `src/engine/vnext/__tests__/temporalPerception.test.ts` (accessible via `/api/vnext/test-temporal-perception`):

1. Single observation remains provisional.
2. Later camera evidence revises earlier interpretation.
3. Original sensory observation remains immutable.
4. Later contradictory evidence decreases confidence & increases entropy.
5. Multiple frames are correctly grouped into one event.
6. Multiple audio segments are correctly integrated.
7. Conversation clarification revises previous interpretation.
8. Relevant memory provides context without overriding current evidence.
9. Sensor absence does not produce fabricated perception.
10. Prediction error triggers additional attention when appropriate.
11. Redundant observations are compressed without losing provenance.
12. Temporal windows expire correctly.
13. Safety-relevant observations bypass efficiency shortcuts.
14. Temporal revision preserves complete memory lineage.
15. Governance permissions remain unchanged during temporal revision.
