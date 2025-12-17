import { Employee, RoleGroup, RotationGroup, ShiftType, DaySchedule, ScheduleResult, ShiftAssignment } from "../types";

export class Scheduler {
  private employees: Employee[];
  private year: number;
  private month: number;
  private specialHolidayDates: number[];
  private publicHolidayDates: number[];
  private weeklyRestGroups: RotationGroup[]; 
  private prevMonthTail: DaySchedule[]; // Last few days of previous month
  private logs: string[] = [];

  constructor(
    employees: Employee[], 
    year: number, 
    month: number, 
    specialHolidayDates: number[] = [],
    publicHolidayDates: number[] = [],
    weeklyRestGroups: RotationGroup[] = [],
    prevMonthTail: DaySchedule[] = [] // New parameter for cross-month history
  ) {
    this.employees = employees;
    this.year = year;
    this.month = month;
    this.specialHolidayDates = specialHolidayDates;
    this.publicHolidayDates = publicHolidayDates;
    this.weeklyRestGroups = weeklyRestGroups.length > 0 
      ? weeklyRestGroups 
      : [RotationGroup.R1, RotationGroup.R2, RotationGroup.R3, RotationGroup.R4, RotationGroup.R1, RotationGroup.R2];
    this.prevMonthTail = prevMonthTail;
  }

  private log(msg: string) {
    this.logs.push(msg);
  }

  private getDaysInMonth(): number {
    return new Date(this.year, this.month + 1, 0).getDate();
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sun or Sat
  }

  private getRestGroupForDate(date: Date): RotationGroup | null {
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dom = date.getDate();
    
    let anchorSatDom = dom;

    if (day === 0) {
        anchorSatDom = dom - 1;
    } else {
        anchorSatDom = dom + (6 - day);
    }

    if (anchorSatDom < 1) {
        return null;
    }

    const index = Math.floor((anchorSatDom - 1) / 7);
    
    if (index >= this.weeklyRestGroups.length) {
        return this.weeklyRestGroups[this.weeklyRestGroups.length - 1];
    }
    
    return this.weeklyRestGroups[index];
  }

  /**
   * Helper to get assignments for a past day (handling cross-month boundary)
   * tMinus: 1 for yesterday, 7 for a week ago, etc.
   */
  private getPastDayAssignments(dayIndex: number, tMinus: number, scheduleSoFar: DaySchedule[]): { assignments: ShiftAssignment[], isSpecial: boolean, dateStr: string } | null {
    const targetIndex = dayIndex - tMinus;

    // Case 1: Look within current month
    if (targetIndex >= 0) {
        return {
            assignments: scheduleSoFar[targetIndex].assignments,
            isSpecial: scheduleSoFar[targetIndex].isSpecialHoliday,
            dateStr: `Current Month ${scheduleSoFar[targetIndex].dayOfMonth}`
        };
    }

    // Case 2: Look into previous month (History)
    // prevMonthTail array is variable length.
    // e.g. tail length = 14. targetIndex = -1 (Last day). Index = 14 + (-1) = 13.
    const prevIndex = this.prevMonthTail.length + targetIndex; 
    
    if (prevIndex >= 0 && prevIndex < this.prevMonthTail.length) {
        const prevDay = this.prevMonthTail[prevIndex];
        return {
            assignments: prevDay.assignments,
            isSpecial: prevDay.isSpecialHoliday,
            dateStr: `Prev Month ${prevDay.dayOfMonth}`
        };
    }

    return null; // No history available for that far back
  }

  /**
   * Check if employee worked Shift B or C in the "previous week" range.
   * Logic: Checks T-5 to T-9 days range to cover the previous weekend/holiday block.
   */
  private hasWorkedShiftBCLastWeek(employeeId: string, dayIndex: number, scheduleSoFar: DaySchedule[]): boolean {
    // Check range [T-9, T-5]
    for (let i = 5; i <= 9; i++) {
        const past = this.getPastDayAssignments(dayIndex, i, scheduleSoFar);
        if (past) {
            const hasAssignment = past.assignments.some(a => 
                a.employeeId === employeeId && 
                (a.shiftType === ShiftType.B || a.shiftType === ShiftType.C)
            );
            if (hasAssignment) return true;
        }
    }
    return false;
  }

  /**
   * Core Constraint Check (Hard Constraints)
   */
  private isEligible(
    employee: Employee,
    dayIndex: number,
    targetShift: ShiftType,
    scheduleSoFar: DaySchedule[],
    isSpecialHoliday: boolean
  ): { eligible: boolean; reason?: string } {
    const date = scheduleSoFar[dayIndex].date;
    
    // 1. Role Check
    if (targetShift === ShiftType.A && employee.role !== RoleGroup.G1) {
        return { eligible: false, reason: "Role Mismatch (A)" };
    }
    
    if (targetShift === ShiftType.B && ![RoleGroup.G1, RoleGroup.G2].includes(employee.role)) {
        return { eligible: false, reason: "Role Mismatch (B)" };
    }

    if (targetShift === ShiftType.C) {
        const allowedRoles = [RoleGroup.G1, RoleGroup.G3];
        if (isSpecialHoliday) {
            allowedRoles.push(RoleGroup.G2); 
        }
        
        if (!allowedRoles.includes(employee.role)) {
            return { eligible: false, reason: "Role Mismatch (C)" };
        }
    }

    // 2. Rotation Group Check
    const restGroup = this.getRestGroupForDate(date);
    if (restGroup && (targetShift === ShiftType.B || targetShift === ShiftType.C)) {
        if (employee.rotationGroup === restGroup) {
            return { eligible: false, reason: `Rest Week (${restGroup})` };
        }
    }

    // 3. Already assigned today?
    if (scheduleSoFar[dayIndex].assignments.some(a => a.employeeId === employee.id)) {
      return { eligible: false, reason: "Already working today" };
    }

    // --- CROSS-MONTH & CURRENT MONTH BACKWARD CHECKS ---

    // 4. Consecutive Work Check (T-1)
    const t1 = this.getPastDayAssignments(dayIndex, 1, scheduleSoFar);
    if (t1) {
        const prevAssignment = t1.assignments.find(a => a.employeeId === employee.id);
        if (prevAssignment) {
            // EXCEPTION: Prev (Special C) -> Curr (B) allowed
            const isExceptionCase = t1.isSpecial && prevAssignment.shiftType === ShiftType.C && targetShift === ShiftType.B;
            
            if (!isExceptionCase) {
                return { eligible: false, reason: `Consecutive Work (${t1.dateStr})` };
            }
        }
    }

    // 5. Rest Period Check (Shift A/B requires 2 days rest)
    // Check T-1
    if (t1) {
        const prevAssignment = t1.assignments.find(a => a.employeeId === employee.id);
        if (prevAssignment && [ShiftType.A, ShiftType.B].includes(prevAssignment.shiftType)) {
             return { eligible: false, reason: `Rest Period violation from T-1 (${t1.dateStr})` };
        }
    }

    // Check T-2
    const t2 = this.getPastDayAssignments(dayIndex, 2, scheduleSoFar);
    if (t2) {
        const prev2Assignment = t2.assignments.find(a => a.employeeId === employee.id);
        if (prev2Assignment && [ShiftType.A, ShiftType.B].includes(prev2Assignment.shiftType)) {
            return { eligible: false, reason: `Rest Period violation from T-2 (${t2.dateStr})` };
        }
    }

    // 6. Forward Check (Future Conflicts)
    
    // Forward T+1 Check
    if (dayIndex < scheduleSoFar.length - 1) {
        const nextDay = scheduleSoFar[dayIndex + 1];
        const nextAssignment = nextDay.assignments.find(a => a.employeeId === employee.id);
        
        if (nextAssignment) {
            const isExceptionCase = isSpecialHoliday && targetShift === ShiftType.C && nextAssignment.shiftType === ShiftType.B;
            if (!isExceptionCase) {
                return { eligible: false, reason: "Conflict with Future T+1 Assignment" };
            }
        }
    }

    // Forward T+2 Check
    if (dayIndex < scheduleSoFar.length - 2) {
        const next2Day = scheduleSoFar[dayIndex + 2];
        const next2Assignment = next2Day.assignments.find(a => a.employeeId === employee.id);
        
        if (next2Assignment) {
            if ([ShiftType.A, ShiftType.B].includes(targetShift) && [ShiftType.A, ShiftType.B].includes(next2Assignment.shiftType)) {
                 return { eligible: false, reason: "Conflict with Future T+2 Assignment" };
            }
        }
    }

    return { eligible: true };
  }

  public generate(): ScheduleResult {
    const daysInMonth = this.getDaysInMonth();
    const schedule: DaySchedule[] = [];

    // Step 1: Initialize Schedule Structure
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(this.year, this.month, i);
      const isWknd = this.isWeekend(date);
      const isSpecial = this.specialHolidayDates.includes(i);
      const isPublic = this.publicHolidayDates.includes(i);
      const isHoliday = isWknd || isSpecial || isPublic;

      schedule.push({
        date: date,
        dayOfMonth: i,
        isWeekend: isWknd,
        isHoliday: isHoliday,
        isSpecialHoliday: isSpecial,
        isPublicHoliday: isPublic,
        assignments: [],
        requiredCounts: {
          [ShiftType.A]: (!isHoliday) ? 3 : 0,
          [ShiftType.B]: (isHoliday) ? 3 : 0,
          [ShiftType.C]: (isHoliday) ? (isSpecial ? 3 : 1) : 0,
        }
      });
    }

    if (this.prevMonthTail.length > 0) {
        this.log(`Linked with history: Considering last ${this.prevMonthTail.length} days of previous month.`);
    }

    // Prioritize Hard Assignments
    const dayIndices = Array.from({ length: daysInMonth }, (_, i) => i);
    dayIndices.sort((a, b) => {
      const dayA = schedule[a];
      const dayB = schedule[b];
      
      // 1. Special Holiday
      if (dayA.isSpecialHoliday && !dayB.isSpecialHoliday) return -1;
      if (!dayA.isSpecialHoliday && dayB.isSpecialHoliday) return 1;
      
      // 2. Weekend/Holiday
      if (dayA.isHoliday && !dayB.isHoliday) return -1;
      if (!dayA.isHoliday && dayB.isHoliday) return 1;

      // 3. Thursday Priority
      const isThuA = dayA.date.getDay() === 4;
      const isThuB = dayB.date.getDay() === 4;
      if (isThuA && !isThuB) return -1;
      if (!isThuA && isThuB) return 1;
      
      return a - b;
    });

    this.log("Starting generation with Fairness Algorithm...");
    let success = true;

    for (const dayIdx of dayIndices) {
      const day = schedule[dayIdx];
      const neededA = day.requiredCounts[ShiftType.A] || 0;
      const neededB = day.requiredCounts[ShiftType.B] || 0;
      const neededC = day.requiredCounts[ShiftType.C] || 0;

      if (neededC > 0) {
        if (!this.fillShift(dayIdx, ShiftType.C, neededC, schedule)) {
            this.log(`Failed to fill Shift C on day ${day.dayOfMonth}`);
            success = false;
        }
      }

      if (neededB > 0) {
         if (!this.fillShift(dayIdx, ShiftType.B, neededB, schedule)) {
            this.log(`Failed to fill Shift B on day ${day.dayOfMonth}`);
            success = false;
         }
      }

      if (neededA > 0) {
         if (!this.fillShift(dayIdx, ShiftType.A, neededA, schedule)) {
            this.log(`Failed to fill Shift A on day ${day.dayOfMonth}`);
            success = false;
         }
      }
    }

    return {
      schedule,
      success,
      logs: this.logs
    };
  }

  /**
   * Assigns employees to a shift type for a specific day.
   */
  private fillShift(dayIdx: number, type: ShiftType, count: number, schedule: DaySchedule[]): boolean {
    let assigned = 0;
    const currentDay = schedule[dayIdx];
    const isThursday = currentDay.date.getDay() === 4; 

    // 1. Calculate current workload for fairness
    const workloadMap = new Map<string, number>();
    this.employees.forEach(e => workloadMap.set(e.id, 0));
    
    schedule.forEach(day => {
        day.assignments.forEach(ass => {
            const current = workloadMap.get(ass.employeeId) || 0;
            workloadMap.set(ass.employeeId, current + 1);
        });
    });

    let candidates: Employee[] = [...this.employees];

    // 2. Apply Thursday Force Rule
    if (isThursday && type === ShiftType.A) {
        const targetGroup = this.getRestGroupForDate(currentDay.date);
        
        if (targetGroup) {
            const strictCandidates = candidates.filter(e => 
                e.rotationGroup === targetGroup && 
                e.role === RoleGroup.G1
            );

            if (strictCandidates.length > 0) {
                candidates = strictCandidates.sort(() => Math.random() - 0.5);
            } else {
                this.log(`Warning: No G1 members found in Rest Group ${targetGroup} for Thursday ${currentDay.dayOfMonth}`);
            }
        }
    } else {
        // 3. Normal Sort + Soft Consecutive Constraint
        candidates.sort((a, b) => {
            // Priority 0: Soft Consecutive Constraint (for Shift B/C)
            // If checking for B or C, punish those who worked B or C last week.
            if (type === ShiftType.B || type === ShiftType.C) {
                const aWorkedLastWeek = this.hasWorkedShiftBCLastWeek(a.id, dayIdx, schedule);
                const bWorkedLastWeek = this.hasWorkedShiftBCLastWeek(b.id, dayIdx, schedule);
                
                // If one worked and the other didn't, prefer the one who didn't.
                if (aWorkedLastWeek && !bWorkedLastWeek) return 1; // a goes down
                if (!aWorkedLastWeek && bWorkedLastWeek) return -1; // b goes down
            }

            // Priority 1: Workload Fairness (Least worked first)
            const countA = workloadMap.get(a.id) || 0;
            const countB = workloadMap.get(b.id) || 0;
            if (countA !== countB) return countA - countB;
            
            // Priority 2: Random tie-break
            return Math.random() - 0.5;
        });
    }

    for (const emp of candidates) {
      if (assigned >= count) break;

      const eligibility = this.isEligible(emp, dayIdx, type, schedule, schedule[dayIdx].isSpecialHoliday);
      
      if (eligibility.eligible) {
        let isException = false;
        
        if (dayIdx > 0 && type === ShiftType.B) {
             const prevDay = schedule[dayIdx - 1];
             const prevAss = prevDay.assignments.find(a => a.employeeId === emp.id);
             if (prevAss && prevAss.shiftType === ShiftType.C && prevDay.isSpecialHoliday) {
                 isException = true;
             }
        }
        
        schedule[dayIdx].assignments.push({
          employeeId: emp.id,
          shiftType: type,
          isSpecialException: isException
        });
        assigned++;
      }
    }

    return assigned === count;
  }
}