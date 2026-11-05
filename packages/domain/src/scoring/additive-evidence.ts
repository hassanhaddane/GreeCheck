/** Documentary references independent of the editorial additive scoring registry. */
export const ADDITIVE_EVIDENCE_VERSION = "AE-1.0.0";

export interface AdditiveEvidence {
  authority: "EFSA" | "ANSES";
  url: string;
  issuedAt: string;
  status: "scientific_opinion" | "risk_assessment";
}

const nitrites: AdditiveEvidence = {
  authority: "ANSES", url: "https://www.anses.fr/system/files/ERCA2020SA0106EN.pdf",
  issuedAt: "2022-07-06", status: "risk_assessment"
};

const evidence = new Map<string, AdditiveEvidence>([
  ["e249", nitrites],
  ["e250", nitrites],
  ["e951", {
    authority: "EFSA", url: "https://doi.org/10.2903/j.efsa.2013.3496",
    issuedAt: "2013-12-10", status: "scientific_opinion"
  }]
]);

export function additiveEvidenceFor(code: string): AdditiveEvidence | undefined {
  return evidence.get(code.toLowerCase().replace(/^en:/, "").replace(/\s/g, ""));
}
