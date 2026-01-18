
import { ROTATION_PATTERN, MIN_STAFF_MORNING, MIN_STAFF_EVENING } from './constants';
import { getDaysInMonth, getEffectiveShift, isWeekend, getShiftById, getWeeksForMonth } from './utils';
import type { Employee, ShiftOverride } from './types';

interface GenerationParams {
  employees: Employee[];
  schedule: Record<string, string>;
  overrides: Record<string, ShiftOverride>;
  lockedCells: Record<string, boolean>;
  englishLessons: Record<string, boolean>;
  year: number;
  month: number;
  workingDays: number;
}

export const generateScheduleLogic = ({
  employees,
  schedule,
  overrides,
  lockedCells,
  englishLessons,
  year,
  month,
  workingDays
}: GenerationParams) => {
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weeks = getWeeksForMonth(year, month);
  
  const newSchedule = { ...schedule };
  const newOverrides = { ...overrides };

  // Filter employees eligible for auto-generation
  const employeesToGenerate = employees.filter(e => 
    e.contract === 'UoP' || (e.contract === 'UZ' && e.generationType === 'auto')
  );

  // --- CACHE & HELPERS ---
  
  // Cache for staff counts per day: day -> { morning, evening }
  const staffCountsCache: Record<number, { morning: number, evening: number }> = {};
  
  // Cache for employee total hours: empId -> totalHours
  const employeeHoursCache: Record<string, number> = {};

  // Initialize Cache
  daysArray.forEach(d => staffCountsCache[d] = { morning: 0, evening: 0 });
  
  employees.forEach(e => {
      employeeHoursCache[e.id] = 0;
      daysArray.forEach(d => {
          const sId = newSchedule[`${e.id}-${d}`];
          // Even unlocked shifts contribute to initial cache state
          if (!sId || sId === 'OFF') {
              if (englishLessons[`${e.id}-${d}`]) employeeHoursCache[e.id] += 1;
              return;
          }

          const ov = newOverrides[`${e.id}-${d}`];
          const shift = getEffectiveShift(sId, e.workSystem, ov);

          // Hours
          employeeHoursCache[e.id] += shift.hours;
          if (englishLessons[`${e.id}-${d}`]) employeeHoursCache[e.id] += 1;

          // Staff Counts
          if (shift.type !== 'absence') {
             if (shift.start <= 8 && shift.end > 8) staffCountsCache[d].morning++;
             if (shift.end >= 21) staffCountsCache[d].evening++;
          }
      });
  });

  const updateCache = (emp: Employee, day: number, newShiftId: string) => {
      // 1. Revert Old
      const oldShiftId = newSchedule[`${emp.id}-${day}`];
      if (oldShiftId && oldShiftId !== 'OFF') {
          const ov = newOverrides[`${emp.id}-${day}`];
          const shift = getEffectiveShift(oldShiftId, emp.workSystem, ov);
          
          employeeHoursCache[emp.id] -= shift.hours;
          
          if (shift.type !== 'absence') {
              if (shift.start <= 8 && shift.end > 8) staffCountsCache[day].morning--;
              if (shift.end >= 21) staffCountsCache[day].evening--;
          }
      }

      // 2. Set New
      newSchedule[`${emp.id}-${day}`] = newShiftId;

      // 3. Apply New
      if (newShiftId && newShiftId !== 'OFF') {
          // Note: generator doesn't create overrides, so we assume no override for generated shifts usually
          const shift = getEffectiveShift(newShiftId, emp.workSystem); 
          
          employeeHoursCache[emp.id] += shift.hours;
          
          if (shift.type !== 'absence') {
              if (shift.start <= 8 && shift.end > 8) staffCountsCache[day].morning++;
              if (shift.end >= 21) staffCountsCache[day].evening++;
          }
      }
  };

  const getCachedHours = (empId: string) => employeeHoursCache[empId] || 0;
  const getCachedStaffCounts = (day: number) => staffCountsCache[day];

  // Check strict constraints (11h rest, max 5 days streak)
  const checkConstraints = (emp: Employee, day: number, shiftId: string) => {
    if (lockedCells[`${emp.id}-${day}`]) return false;
    // Don't overwrite existing shifts
    if (newSchedule[`${emp.id}-${day}`] && newSchedule[`${emp.id}-${day}`] !== 'OFF') return false; 
    
    const proposedShift = getEffectiveShift(shiftId, emp.workSystem);
    
    // 1. Check Previous Day (11h Rest)
    const prevKey = `${emp.id}-${day - 1}`;
    const prevShiftId = newSchedule[prevKey];
    if (prevShiftId && prevShiftId !== 'OFF') {
      const prevOverride = newOverrides[prevKey];
      const prevShift = getEffectiveShift(prevShiftId, emp.workSystem, prevOverride);
      if (prevShift.type !== 'absence') {
          const gap = (24 - prevShift.end) + proposedShift.start;
          if (gap < 11) return false;
      }
    }

    // 2. Check Next Day (11h Rest)
    const nextKey = `${emp.id}-${day + 1}`;
    const nextShiftId = newSchedule[nextKey];
    if (nextShiftId && nextShiftId !== 'OFF') {
       const nextOverride = newOverrides[nextKey];
       const nextShift = getEffectiveShift(nextShiftId, emp.workSystem, nextOverride);
       if (nextShift.type !== 'absence') {
           const gap = (24 - proposedShift.end) + nextShift.start;
           if (gap < 11) return false;
       }
    }

    // 3. Check Consecutive Days (Max 5 working days in a row)
    let streakBefore = 0;
    let d = day - 1;
    while (d >= 1) {
        const sId = newSchedule[`${emp.id}-${d}`];
        if (sId && sId !== 'OFF') {
           const ov = newOverrides[`${emp.id}-${d}`];
           const s = getEffectiveShift(sId, emp.workSystem, ov);
           if (s.type !== 'absence') streakBefore++; else break; 
        } else break;
        d--; 
    }

    let streakAfter = 0;
    d = day + 1;
     while (d <= daysInMonth) {
        const sId = newSchedule[`${emp.id}-${d}`];
        if (sId && sId !== 'OFF') {
           const ov = newOverrides[`${emp.id}-${d}`];
           const s = getEffectiveShift(sId, emp.workSystem, ov);
           if (s.type !== 'absence') streakAfter++; else break; 
        } else break;
        d++; 
    }

    if (streakBefore + 1 + streakAfter > 5) return false;

    return true;
  };

  // --- PHASE 1: Clear Unlocked Shifts ---
  employeesToGenerate.forEach(emp => {
    daysArray.forEach(day => {
      const key = `${emp.id}-${day}`;
      if (lockedCells[key]) return;
      if (newOverrides[key]) return;
      const currentShiftId = newSchedule[key];
      if (currentShiftId) {
           const shiftDef = getShiftById(currentShiftId);
           if (shiftDef.type === 'absence') return; 
           
           // Use updateCache to clear properly
           updateCache(emp, day, 'OFF');
      }
    });
  });

  // 2. Assign Rotation Offset
  const employeesWithContext = employeesToGenerate.map((emp, index) => ({
    ...emp,
    rotationOffset: index % ROTATION_PATTERN.length 
  }));

  // --- PHASE 2 & 3: Weekly Rotation & Filling ---
  weeks.forEach((week, weekIndex) => {
    const weekProcessingList = [...employeesWithContext].sort(() => Math.random() - 0.5);

    weekProcessingList.forEach((emp) => {
      const systemHours = emp.workSystem === '8h' ? 8 : 7;
      const individualTargetHours = workingDays * systemHours;

      if (getCachedHours(emp.id) >= individualTargetHours) return;

      const rotationIndex = (emp.rotationOffset + weekIndex) % ROTATION_PATTERN.length;
      let baseShiftId = ROTATION_PATTERN[rotationIndex];
      
      const lateShift = emp.workSystem === '8h' ? '13-21' : '14-21';
      
      if (baseShiftId === '14-21' && emp.workSystem === '8h') baseShiftId = '13-21';

      const originalIndex = employeesWithContext.findIndex(e => e.id === emp.id);
      const worksWeekend = (originalIndex + weekIndex) % 2 === 0;

      const daysToFill = [];
      for (let d = week.start; d <= week.end; d++) daysToFill.push(d);
      const weekendDays = daysToFill.filter(d => isWeekend(year, month, d));
      const weekDays = daysToFill.filter(d => !isWeekend(year, month, d));

      // A. Fill Weekend
      if (worksWeekend && weekendDays.length > 0) {
         const weekendPreference = (baseShiftId === '14-21' || baseShiftId === '12-19' || baseShiftId === '13-21') ? lateShift : '8-15';
         weekendDays.forEach(day => {
            if (lockedCells[`${emp.id}-${day}`]) return;
            if (newSchedule[`${emp.id}-${day}`]) return; 
            
            const counts = getCachedStaffCounts(day);
            let shiftToAssign = weekendPreference;
            
            if (counts.evening < MIN_STAFF_EVENING - 2 && baseShiftId === '8-15') shiftToAssign = lateShift;
            else if (counts.morning < MIN_STAFF_MORNING - 3 && baseShiftId !== '8-15') shiftToAssign = '8-15';

            const tryShifts = [...new Set([shiftToAssign, lateShift, '8-15', '12-19'])];

            for (const shiftToTry of tryShifts) {
                if (checkConstraints(emp, day, shiftToTry)) {
                    updateCache(emp, day, shiftToTry);
                    break; 
                }
            }
         });
      }

      // B. Fill Weekdays
      const targetWorkDays = 5;
      const daysScheduledThisWeek = daysToFill.filter(d => {
           const s = newSchedule[`${emp.id}-${d}`];
           return s && s !== 'OFF';
      }).length;

      const neededWeekdays = Math.max(0, targetWorkDays - daysScheduledThisWeek);
      
      const daysToWork = [...weekDays]
          .filter(d => !newSchedule[`${emp.id}-${d}`]) // Not already filled
          .filter(d => !lockedCells[`${emp.id}-${d}`]) 
          .sort(() => Math.random() - 0.5) 
          .slice(0, neededWeekdays) 
          .sort((a, b) => a - b); 

      daysToWork.forEach(day => {
          if (lockedCells[`${emp.id}-${day}`]) return;
          
          if (getCachedHours(emp.id) >= individualTargetHours) return;

          const counts = getCachedStaffCounts(day);
          
          let priorityList = [baseShiftId];

          if (counts.evening < MIN_STAFF_EVENING - 3) {
             priorityList = [lateShift, '12-19', baseShiftId];
          } else if (counts.morning < MIN_STAFF_MORNING - 4) {
             priorityList = ['8-15', '10-17', baseShiftId];
          } else {
             priorityList = [baseShiftId, '10-17', '12-19', '8-15', lateShift];
          }

          const uniqueShifts = [...new Set(priorityList)];

          for (const shiftToTry of uniqueShifts) {
               if (checkConstraints(emp, day, shiftToTry)) {
                  updateCache(emp, day, shiftToTry);
                  break;
               }
          }
      });
    });
  });

  // --- PHASE 4: BACKFILL (Dopychanie godzin) ---
  employeesWithContext.forEach(emp => {
      const systemHours = emp.workSystem === '8h' ? 8 : 7;
      const individualTargetHours = workingDays * systemHours;
      const lateShift = emp.workSystem === '8h' ? '13-21' : '14-21';

      let currentHours = getCachedHours(emp.id);
      if (currentHours >= individualTargetHours) return;

      const emptyDays = daysArray.filter(day => 
          !newSchedule[`${emp.id}-${day}`] && 
          !lockedCells[`${emp.id}-${day}`]
      );

      emptyDays.sort(() => Math.random() - 0.5);

      for (const day of emptyDays) {
          currentHours = getCachedHours(emp.id); // re-check inside loop
          if (currentHours >= individualTargetHours) break;

          const counts = getCachedStaffCounts(day);
          
          // Variety in Backfill
          let preferredBackfill = '10-17'; 
          const rand = Math.random();
          if (rand > 0.6) preferredBackfill = '12-19';
          else if (rand > 0.3) preferredBackfill = '8-15';

          // If really short on staff, prioritize that
           if (counts.evening < MIN_STAFF_EVENING - 2) preferredBackfill = lateShift;
           else if (counts.morning < MIN_STAFF_MORNING - 2) preferredBackfill = '8-15';

          const tryShifts = [...new Set([preferredBackfill, '8-15', '12-19', lateShift])];

          for (const shiftToTry of tryShifts) {
              if (checkConstraints(emp, day, shiftToTry)) {
                  updateCache(emp, day, shiftToTry);
                  break;
              }
          }
      }
  });

  return newSchedule;
};
