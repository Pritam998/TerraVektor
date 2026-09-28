/**
 * Structured query plan for deterministic natural language investigation
 */

export type InvestigationIntent = 'built_up_change' | 'vegetation_change' | 'general_change';

export type Direction = 'increase' | 'decrease' | 'change' | null;

export type QueryStatus = 'valid' | 'incomplete' | 'ambiguous' | 'unsupported';

export interface QueryPlan {
  status: QueryStatus;
  intent: InvestigationIntent | null;
  location: string | null;
  aoi: [number, number, number, number] | null;
  startDate: string | null;
  endDate: string | null;
  direction: Direction;
  confidence: number; // 0-1 confidence score for parsing
  missingFields: string[];
  ambiguousFields: string[];
  unsupportedTerms: string[];
  originalQuery: string;
  normalizedQuery: string;
}

export interface QueryClarification {
  title: string;
  description: string;
  missingFields: Array<{
    field: string;
    description: string;
    suggestions: string[];
  }>;
  ambiguousFields: Array<{
    field: string;
    options: Array<{
      label: string;
      value: any;
    }>;
  }>;
  exampleQueries: string[];
}
