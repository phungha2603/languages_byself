/** The four core English skills every learning path is built from. */
export const SKILLS = ["listening", "speaking", "reading", "writing"] as const;
export type Skill = (typeof SKILLS)[number];

/** Secondary cross-cutting dimensions tracked alongside the 4 skills. */
export const SUB_DIMENSIONS = ["grammar", "vocabulary", "pronunciation", "fluency"] as const;
export type SubDimension = (typeof SUB_DIMENSIONS)[number];
