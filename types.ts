export enum RoleGroup {
  G1 = "G1", // All Shifts
  G2 = "G2", // Shift B only
  G3 = "G3", // Shift C only
}

export enum RotationGroup {
  R1 = "R1",
  R2 = "R2",
  R3 = "R3",
  R4 = "R4",
}

export enum ShiftType {
  A = "Shift_A", // Weekday 24h
  B = "Shift_B", // Weekend/Holiday 24h
  C = "Shift_C", // Holiday Day
  OFF = "OFF",
}

export interface Employee {
  id: string;
  name: string;
  role: RoleGroup;
  rotationGroup: RotationGroup;
}

export interface ShiftAssignment {
  employeeId: string;
  shiftType: ShiftType;
  isSpecialException: boolean; // True if assigned via C->B exception
}

export interface DaySchedule {
  date: Date;
  dayOfMonth: number;
  isWeekend: boolean;
  isHoliday: boolean; // Manual flag or calendar logic
  isSpecialHoliday: boolean; // For the specific v7 logic (Myeongjeol)
  isPublicHoliday: boolean; // Treated like Sunday
  assignments: ShiftAssignment[];
  requiredCounts: {
    [key in ShiftType]?: number;
  };
}

export interface ScheduleResult {
  schedule: DaySchedule[];
  success: boolean;
  logs: string[];
}

export interface ScheduleHistoryItem {
  id: string;
  timestamp: number;
  year: number;
  month: number;
  scheduleResult: ScheduleResult;
  employees: Employee[]; // Snapshot of employees at that time
}