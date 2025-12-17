import { Employee, RoleGroup, RotationGroup, ShiftType } from "./types";

export const INITIAL_STAFF: Employee[] = [
  // G1: Can do A, B, C
  { id: "1", name: "Dr. Kim (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R1 },
  { id: "2", name: "Dr. Lee (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R2 },
  { id: "3", name: "Dr. Park (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R3 },
  { id: "4", name: "Dr. Choi (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R4 },
  { id: "5", name: "Dr. Jung (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R1 },
  { id: "6", name: "Dr. Kang (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R2 },
  { id: "7", name: "Dr. Cho (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R3 },
  { id: "8", name: "Dr. Yoon (G1)", role: RoleGroup.G1, rotationGroup: RotationGroup.R4 },
  
  // G2: Only B
  { id: "9", name: "Dr. Jang (G2)", role: RoleGroup.G2, rotationGroup: RotationGroup.R1 },
  { id: "10", name: "Dr. Lim (G2)", role: RoleGroup.G2, rotationGroup: RotationGroup.R2 },
  { id: "11", name: "Dr. Han (G2)", role: RoleGroup.G2, rotationGroup: RotationGroup.R3 },
  
  // G3: Only C
  { id: "12", name: "Dr. Oh (G3)", role: RoleGroup.G3, rotationGroup: RotationGroup.R4 },
  { id: "13", name: "Dr. Seo (G3)", role: RoleGroup.G3, rotationGroup: RotationGroup.R1 },
];

export const SHIFT_COLORS = {
  [ShiftType.A]: "bg-blue-100 text-blue-800 border-blue-200",
  [ShiftType.B]: "bg-purple-100 text-purple-800 border-purple-200",
  [ShiftType.C]: "bg-orange-100 text-orange-800 border-orange-200",
  [ShiftType.OFF]: "bg-gray-50 text-gray-400",
};

export const SHIFT_LABELS = {
  [ShiftType.A]: "Shift A (24h)",
  [ShiftType.B]: "Shift B (24h)",
  [ShiftType.C]: "Shift C (Day)",
};
