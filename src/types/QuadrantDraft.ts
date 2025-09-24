// src/types/QuadrantDraft.ts
export interface QuadrantDraft {
  id: string;
  code: string;
  eventName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  totalWorkers: number;
  numDrivers: number;
  location?: string;
  responsableId?: string;
  treballadors?: string[];
  conductors?: string[];
  status: 'draft' | 'confirmed' | 'canceled';
  createdAt: string;
  updatedAt: string;
}
