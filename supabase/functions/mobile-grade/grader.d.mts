export function singleStatement(sql: unknown): boolean;
export function grade(
  questions: Array<Record<string, unknown>>,
  answers: Record<string, unknown>,
): Promise<Record<string, boolean>>;

export function validateReferences(
  questions: Array<Record<string, unknown>>,
): Promise<void>;
export function runLab(
  kind: string,
  query: string,
  check: boolean,
): Promise<{
  columns: number;
  names: string[];
  rows: Array<Array<string | number | null>>;
  passed: boolean;
}>;
