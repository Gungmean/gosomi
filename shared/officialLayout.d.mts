export type FormPosition = { x: number; y: number; w: number; h: number }
export type TextPosition = FormPosition & { field: string; part?: string; when?: string; option?: string; multiline?: boolean; recipient?: boolean }
export type ChoicePosition = FormPosition & { page: number; field: string; option: string }
export const officialLayouts: Record<'fraud' | 'defamation' | 'assault', { pages: number[]; texts: TextPosition[][]; choices: ChoicePosition[]; checklistRows: Record<string, number> }>
