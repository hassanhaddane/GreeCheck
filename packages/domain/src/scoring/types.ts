import type { Grade, NutritionProfile2023, Nutriments } from "../product/model";
import type { FieldProvenance } from "../product/provenance";
import type { AdditiveEvidence } from "./additive-evidence";

export type ScoreGrade = "A" | "B" | "C" | "D" | "E";
export type ConfidenceLevel = "high" | "medium" | "low";
export type ScoreValues = Record<string, string | number>;
export type VerdictCode = "excellent_choice" | "good_choice" | "mixed_profile" | "limit" | "low_profile" | "insufficient_data" | "excluded_category" | "unsupported_category";

export interface ScoreReason {
  kind: "bonus" | "malus" | "info";
  code: string;
  impact: number;
  values?: ScoreValues;
}

export interface ProductWarning {
  level: "info" | "warning" | "critical";
  code: string;
  values?: ScoreValues;
}

export type UnscoredReasonCode =
  | "missing_nutrition_data"
  | "conflicting_nutrition_data"
  | "invalid_nutrition_data"
  | "excluded_unsupported_category"
  | "unknown_nutrition_category";

export interface UnscoredReason {
  code: UnscoredReasonCode;
  values?: ScoreValues;
}

export interface NutritionComponent {
  points?: number;
  pointsSource: "provider_2023" | "computed_2023" | "plain_water";
  profile: NutritionProfile2023;
  officialGrade: Grade;
  contribution: number;
  /** Included for locally reproduced calculations. */
  inputs?: { negative: number; positive: number; factors: ScoreReason[] };
}

export interface ScoreEvidence {
  officialMethod: { version: "2023"; url: string };
  productSource?: FieldProvenance;
  fields?: Readonly<Record<string, FieldProvenance>>;
  additives: { code: string; reference?: AdditiveEvidence }[] | undefined;
  organicLabel?: string;
  novaGroup?: 1 | 2 | 3 | 4;
}

interface ScoreCommon {
  methodologyVersion: string;
  methodologyUpdatedAt: string;
  registryVersion: string;
  verdict: VerdictCode;
  reasons: ScoreReason[];
  topPositives: ScoreReason[];
  topNegatives: ScoreReason[];
  warnings: ProductWarning[];
  alerts: ProductWarning[];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  missingData: string[];
  evidence: ScoreEvidence;
}

export interface ScoredGreeScore extends ScoreCommon {
  status: "scored";
  score: number;
  grade: ScoreGrade;
  components: { nutrition: NutritionComponent };
  reason?: never;
}

export interface UnscoredGreeScore extends ScoreCommon {
  status: "unscored";
  score?: never;
  grade?: never;
  components?: never;
  reason: UnscoredReason;
  availableFacts: {
    nutriments: Nutriments;
    ingredientsReported: boolean;
    nutriScore?: Grade;
    novaGroup?: 1 | 2 | 3 | 4;
  };
  possibleActions: ("inspect_facts" | "check_source" | "contribute")[];
}

export type GreeScore = ScoredGreeScore | UnscoredGreeScore;

export interface ScoreExplanation {
  code: string;
  values?: ScoreValues;
}
