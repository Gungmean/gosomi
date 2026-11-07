export type FormQuestion = { id: string; label: string; options: string[]; multiple?: boolean }
export const typeQuestions: Record<'fraud' | 'defamation' | 'assault', FormQuestion[]>;
export const checklistQuestions: Record<'fraud' | 'defamation' | 'assault', { id: string; label: string }[]>;
export const evidenceQuestions: Record<'fraud' | 'defamation' | 'assault', FormQuestion>;
export const punishmentQuestion: FormQuestion;
export function selectedOptions(value?: string): string[];
export function hasSelectedOption(value: string | undefined, option: string): boolean;
