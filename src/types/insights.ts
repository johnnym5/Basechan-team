/**
 * Type definitions for the Pure Deterministic Insight Engine.
 */

export interface OperationalMomentum {
  omi: number; // 0 - 100
  taskVelocityScore: number; // Sv
  punctualityScore: number; // Sp
  reliabilityScore: number; // Sr
  streakScore: number; // Sc
  frictionPenalty: number; // Pf
  trend: 'UPWARD' | 'STABLE' | 'DOWNWARD';
}

export interface ApprovedRestItem {
  date: string;
  type: string;
}

export interface PendingValidationItem {
  date: string;
  leaveId: string;
  type: string;
}

export interface AbsenceTriage {
  approvedRest: ApprovedRestItem[];
  pendingValidation: PendingValidationItem[];
  unexcused: string[];
}

export interface FatigueVector {
  isStrainDetected: boolean;
  avgDailyHours: number;
  lateNightSubmissionsCount: number;
  sentimentDelta: number;
  message: string;
  ctaText?: string;
  ctaAction?: string;
}

export interface SanitizedMemo {
  rawText: string;
  sanitizedText: string;
  tags: string[];
  issueKeys: string[];
  quality: 'GOOD' | 'FAIR' | 'POOR';
  warningMessage?: string;
}

export interface ActionableDirective {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  actionText: string;
  actionType: string;
  payload?: any;
}

export interface InsightEngineResult {
  momentum: OperationalMomentum;
  punctualitySlope: number; // beta (drift in mins/day)
  punctualityStatus: 'DEGRADING' | 'CONSOLIDATING' | 'STABLE';
  absenceTriage: AbsenceTriage;
  fatigue: FatigueVector;
  sanitizedMemo: SanitizedMemo;
  directives: ActionableDirective[];
  totalOperations: number;
}
