
export type ContractType = 'UoP' | 'UZ';
export type LocationType = 'Katowice' | 'Łódź' | 'Ostrava';
export type WorkSystemType = '7h' | '8h';
export type GenerationType = 'auto' | 'manual';

export interface Employee {
  id: string;
  name: string;
  team: string;
  contract: ContractType;
  location: LocationType;
  workSystem: WorkSystemType;
  generationType?: GenerationType; // 'auto' = treat like UoP, 'manual' = skip in generator
}

export interface Shift {
  id: string;
  label: string;
  start: number; // Hour as number (e.g. 14.5 for 14:30)
  end: number;
  hours: number;
  isWeekendOnly?: boolean;
  type?: 'work' | 'absence'; // New field to distinguish absence
}

export interface ShiftOverride {
  start: number; // Decimal format (e.g. 8.25 for 08:15)
  end: number;
  hours: number;
  note?: string;
}

export interface EmployeeStats {
  totalHours: number;
  fatiguePoints: number;
}
