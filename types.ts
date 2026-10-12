

export interface EventInfo {
  personId: string;
  personName: string;
  eventType: string;
  date: string | null;
  spouseId?: string;
  spouseName?: string;
}

export interface PersonEvent {
  eventType: string;
  date: string | null;
  place: string | null;
  sortYear?: number;
  isInferred?: boolean;
}

export interface Person {
    id: string;
    name: string;
    gender?: 'Male' | 'Female' | 'Unknown';
    events: PersonEvent[];
    spouses?: { id: string; name: string }[];
    children?: { id: string; name: string }[];
    parents?: { id: string; name: string }[];
}

export interface Place {
  name: string;
  lat?: number;
  lon?: number;
  events: EventInfo[];
}

export enum AppState {
  Initial = 'INITIAL',
  Processing = 'PROCESSING',
  Success = 'SUCCESS',
  Error = 'ERROR',
}

export enum ViewMode {
    Location = 'LOCATION',
    Person = 'PERSON',
}

export interface ProgressState {
  step: string;
  current: number;
  total: number;
}

export interface FilterState {
  eventTypes: string[];
  dateRange: { start: number; end: number };
}