
import { SHIFTS, MIN_STAFF_MORNING, MIN_STAFF_EVENING } from './constants';
import type { EmployeeStats, Shift, WorkSystemType, Employee, ShiftOverride } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Fallback type for autoTable rows
type RowInput = any[];

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getDayName = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  return date.toLocaleDateString('pl-PL', { weekday: 'short' });
};

export const isWeekend = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sun, 6 = Sat
};

// Calculate working DAYS for a specific month
export const getMonthlyWorkingDays = (year: number, month: number): number => {
  const daysInMonth = getDaysInMonth(year, month);
  const holidays = getHolidays(year, month);
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const isWk = isWeekend(year, month, day);
    const isHol = holidays.includes(day);
    
    // If it's a weekday and not a holiday, it counts as a working day
    if (!isWk && !isHol) {
      workingDays++;
    }
  }

  return workingDays;
};

// Calculate weeks for a given month dynamically
// Returns array of { start: number, end: number }
export const getWeeksForMonth = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const weeks = [];
  let currentDay = 1;

  while (currentDay <= daysInMonth) {
    const date = new Date(year, month, currentDay);
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon...
    
    // Calculate days until next Sunday (end of week)
    // If today is Sunday (0), distance is 0.
    // If today is Monday (1), distance is 6.
    const distanceToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    
    let endDay = currentDay + distanceToSunday;
    if (endDay > daysInMonth) endDay = daysInMonth;

    weeks.push({ start: currentDay, end: endDay });
    currentDay = endDay + 1;
  }
  return weeks;
};

// Flexible holiday definition
export const getHolidays = (_year: number, month: number): number[] => {
  const holidays: Record<string, number[]> = {
    '0': [1, 6], // January: New Year, Three Kings
    '3': [1, 2], // April (Easter placeholder example)
    '4': [1, 3], // May
    '7': [15],   // August
    '10': [1, 11], // November
    '11': [25, 26] // December
  };
  return holidays[month.toString()] || [];
};

export const getShiftById = (id: string) => SHIFTS.find(s => s.id === id) || SHIFTS[0];

// Time Helpers
export const decimalToTime = (decimal: number): string => {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const timeToDecimal = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h + (m / 60);
};

// Helper to get effective shift details based on employee work system AND overrides
export const getEffectiveShift = (
  shiftId: string, 
  workSystem: WorkSystemType = '7h', 
  override?: ShiftOverride
): Shift => {
  const baseShift = getShiftById(shiftId);
  
  // If overridden, return a virtual shift based on override data
  if (override) {
    return {
      id: shiftId,
      label: `${decimalToTime(override.start)} - ${decimalToTime(override.end)}`,
      start: override.start,
      end: override.end,
      hours: override.hours,
      type: baseShift.type || 'work'
    };
  }

  if (shiftId === 'OFF') return baseShift;

  const hours = workSystem === '8h' ? 8 : 7;

  // Handle Absences - they usually count as a full day of "paid" time
  if (baseShift.type === 'absence') {
      return {
          ...baseShift,
          hours: hours,
          start: baseShift.start,
          end: baseShift.start + hours,
          label: baseShift.label
      }
  }

  // Handle Work Shifts
  // For 8h system, we just add 8 hours to start time.
  // For 7h system, we just add 7 hours to start time.
  if (workSystem === '8h') {
    return {
      ...baseShift,
      end: baseShift.start + 8,
      hours: 8,
      label: `${baseShift.start.toString().padStart(2, '0')}:00 - ${(baseShift.start + 8).toString().padStart(2, '0')}:00`
    };
  }

  // Default 7h (ensure label is correct for 7h as well, e.g. 12+7=19)
  return {
    ...baseShift,
    end: baseShift.start + 7,
    hours: 7,
    label: `${baseShift.start.toString().padStart(2, '0')}:00 - ${(baseShift.start + 7).toString().padStart(2, '0')}:00`
  };
};

export const getWeekendShiftForRotation = (baseShiftId: string): string => {
  // If base shift is evening/late, give evening weekend shift
  if (baseShiftId === '14-21' || baseShiftId === '12-19' || baseShiftId === '13-21') return '14-21'; // Default to 14-21 for rotation purposes, but generator might swap to 13-21 if 8h
  return '8-15';
};

// Calculate stats for an employee (Hours + Fatigue)
export const calculateEmployeeStats = (
  employee: Employee, 
  schedule: Record<string, string>, 
  overrides: Record<string, ShiftOverride>,
  englishLessons: Record<string, boolean>,
  daysArray: number[], 
  year: number, 
  month: number
): EmployeeStats => {
  let totalHours = 0;
  let fatiguePoints = 0;

  daysArray.forEach(day => {
    const shiftKey = `${employee.id}-${day}`;
    const shiftId = schedule[shiftKey] || 'OFF';
    
    // Add English Lesson Hour (regardless of shift, but typically on work days)
    if (englishLessons[shiftKey]) {
        totalHours += 1;
    }

    if (shiftId === 'OFF') return;

    const override = overrides[shiftKey];
    const shift = getEffectiveShift(shiftId, employee.workSystem, override);
    
    totalHours += shift.hours;

    // Fatigue Logic
    if (shift.type === 'absence') return;

    // 1. Weekend work is more tiring (+2 points)
    if (isWeekend(year, month, day)) {
      fatiguePoints += 2;
    }

    // 2. Afternoon shifts are more tiring (+1 point)
    if (shift.start >= 11) {
      fatiguePoints += 1;
    }
  });

  // Round total hours to 2 decimal places to avoid float errors
  totalHours = Math.round(totalHours * 100) / 100;

  return { totalHours, fatiguePoints };
};

// --- Validation Logic ---

export const getValidationWarnings = (
  employee: Employee,
  day: number,
  shiftId: string,
  schedule: Record<string, string>,
  overrides: Record<string, ShiftOverride>,
  daysInMonth: number
): string[] => {
  const warnings: string[] = [];
  
  if (shiftId === 'OFF') return warnings;

  const currentOverride = overrides[`${employee.id}-${day}`];
  const currentShift = getEffectiveShift(shiftId, employee.workSystem, currentOverride);

  // Skip validation for absences
  if (currentShift.type === 'absence') return warnings;

  // 1. Check Previous Day (11h Rest Rule)
  if (day > 1) {
    const prevShiftId = schedule[`${employee.id}-${day - 1}`];
    if (prevShiftId && prevShiftId !== 'OFF') {
      const prevOverride = overrides[`${employee.id}-${day - 1}`];
      const prevShift = getEffectiveShift(prevShiftId, employee.workSystem, prevOverride);
      
      // If previous day was absence, assume fully rested
      if (prevShift.type !== 'absence') {
          // Logic: (24 - prevEnd) + currentStart
          const restHours = (24 - prevShift.end) + currentShift.start;
          if (restHours < 11) {
            warnings.push(`Brak 11h przerwy! Tylko ${restHours.toFixed(1)}h.`);
          }
      }
    }
  }

  // 2. Check Next Day (11h Rest Rule - proactive warning)
  if (day < daysInMonth) {
    const nextShiftId = schedule[`${employee.id}-${day + 1}`];
    if (nextShiftId && nextShiftId !== 'OFF') {
      const nextOverride = overrides[`${employee.id}-${day + 1}`];
      const nextShift = getEffectiveShift(nextShiftId, employee.workSystem, nextOverride);
      
      if (nextShift.type !== 'absence') {
          const restHours = (24 - currentShift.end) + nextShift.start;
          if (restHours < 11) {
            warnings.push(`Brak 11h przerwy przed jutrem!`);
          }
      }
    }
  }

  // 3. Consecutive Days Rule (> 5 days)
  let consecutiveDays = 1; // Count current day
  
  // Look back
  let d = day - 1;
  while (d >= 1) {
    const s = schedule[`${employee.id}-${d}`];
    const sOverride = overrides[`${employee.id}-${d}`];
    const sShift = s ? getEffectiveShift(s, employee.workSystem, sOverride) : null;
    if (s && s !== 'OFF' && sShift?.type !== 'absence') consecutiveDays++;
    else break;
    d--;
  }

  // Look forward
  d = day + 1;
  while (d <= daysInMonth) {
     const s = schedule[`${employee.id}-${d}`];
     const sOverride = overrides[`${employee.id}-${d}`];
     const sShift = s ? getEffectiveShift(s, employee.workSystem, sOverride) : null;
     if (s && s !== 'OFF' && sShift?.type !== 'absence') consecutiveDays++;
     else break;
     d++;
  }

  if (consecutiveDays > 5) {
    warnings.push(`Praca przez ${consecutiveDays} dni z rzędu.`);
  }

  return warnings;
};

// --- Staffing Validation Logic ---
export const checkStaffingLevels = (
  dayCoverage: Record<number, number>,
  isWeekend: boolean
): { valid: boolean; messages: string[] } => {
  if (isWeekend) return { valid: true, messages: [] };

  const messages: string[] = [];
  const morningStaff = dayCoverage[8] || 0; 
  if (morningStaff < MIN_STAFF_MORNING) {
    messages.push(`Rano (8:00): ${morningStaff}/${MIN_STAFF_MORNING}`);
  }
  const eveningStaff = dayCoverage[20] || 0; // Check 20:00-21:00 slot
  if (eveningStaff < MIN_STAFF_EVENING) {
    messages.push(`Wieczór (20:00): ${eveningStaff}/${MIN_STAFF_EVENING}`);
  }

  return { valid: messages.length === 0, messages };
};

// --- PDF GENERATOR ---

export const generateSchedulePDF = async (
  year: number,
  month: number,
  daysArray: number[],
  employees: Employee[],
  teams: string[],
  schedule: Record<string, string>,
  overrides: Record<string, ShiftOverride>,
  englishLessons: Record<string, boolean>,
  holidays: number[]
) => {
  const doc = new jsPDF('l', 'mm', 'a3'); // Landscape A3 for more space

  // --- Load Font for Polish Characters (Roboto) ---
  try {
    const fontUrlReg = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf';
    const fontUrlBold = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf';
    
    // Helper to fetch and convert to base64
    const loadFont = async (url: string) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return window.btoa(binary);
    };

    const [fontReg, fontBold] = await Promise.all([loadFont(fontUrlReg), loadFont(fontUrlBold)]);

    doc.addFileToVFS('Roboto-Regular.ttf', fontReg);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    doc.addFileToVFS('Roboto-Medium.ttf', fontBold);
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
    
    doc.setFont('Roboto');
  } catch (err) {
      console.warn("Could not load Roboto font. Polish characters might not display correctly.", err);
  }
  // ------------------------------------------------

  // Title
  doc.setFontSize(16);
  doc.text(`Grafik Pracy - ${month + 1}/${year}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Data generacji: ${new Date().toLocaleDateString()}`, 14, 22);

  // --- Prepare Data for AutoTable ---

  // 1. Headers
  // First row: 'Pracownik', then day numbers, then 'Suma'
  const headRow: RowInput = [
    { content: 'Pracownik', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
    ...daysArray.map(d => ({ 
      content: d.toString(), 
      styles: { 
        halign: 'center', 
        fillColor: (holidays.includes(d) || isWeekend(year, month, d) ? [241, 245, 249] : [255, 255, 255]) as [number, number, number],
        textColor: (holidays.includes(d) ? [220, 38, 38] : [30, 41, 59]) as [number, number, number]
      } 
    })),
    { content: 'Suma', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
  ];

  // Second header row: Day names
  const dayNamesRow: RowInput = daysArray.map(d => ({
    content: getDayName(year, month, d),
    styles: { 
      halign: 'center', 
      fontSize: 6,
      fillColor: (holidays.includes(d) || isWeekend(year, month, d) ? [241, 245, 249] : [255, 255, 255]) as [number, number, number],
      textColor: [100, 116, 139] as [number, number, number]
    }
  }));

  const body: RowInput[] = [];

  // 2. Rows by Team
  teams.forEach(team => {
    // Add Team Header Row
    const teamEmps = employees.filter(e => e.team === team);
    if (teamEmps.length === 0) return;

    body.push([{ 
      content: team, 
      colSpan: daysArray.length + 2, 
      styles: { fillColor: [226, 232, 240] as [number, number, number], fontStyle: 'bold', textColor: [51, 65, 85] as [number, number, number] } 
    }]);

    teamEmps.forEach(emp => {
       const rowData: any[] = [];
       // Name
       rowData.push({ content: emp.name, styles: { fontStyle: 'bold' } });

       // Shifts
       daysArray.forEach(d => {
         const key = `${emp.id}-${d}`;
         const shiftId = schedule[key] || 'OFF';
         const override = overrides[key];
         const isEng = englishLessons[key];

         let cellText = shiftId === 'OFF' ? '-' : shiftId;
         
         // Apply Override Text
         if (override) {
             cellText = `${decimalToTime(override.start)}-${decimalToTime(override.end)}`;
         } else if (emp.workSystem === '8h' && shiftId !== 'OFF' && !SHIFTS.find(s=>s.id === shiftId)?.type?.includes('absence')) {
             const eff = getEffectiveShift(shiftId, '8h');
             cellText = `${eff.start}-${eff.end}`;
         } else if (emp.workSystem === '7h' && shiftId !== 'OFF' && !SHIFTS.find(s=>s.id === shiftId)?.type?.includes('absence')) {
             const eff = getEffectiveShift(shiftId, '7h');
             cellText = `${eff.start}-${eff.end}`;
         }

         if (isEng) cellText += ' (Ang)';

         // Color Logic
         let fillColor: [number, number, number] = [255, 255, 255]; // White
         let textColor: [number, number, number] = [0, 0, 0];

         const shiftDef = SHIFTS.find(s => s.id === shiftId);

         if (shiftId === 'OFF') {
             if (isWeekend(year, month, d) || holidays.includes(d)) {
                 fillColor = [248, 250, 252]; // Slate-50
                 textColor = [148, 163, 184]; // Slate-400
             }
         } else if (override) {
             fillColor = [255, 251, 235]; // Amber-50
             textColor = [146, 64, 14];   // Amber-800
         } else if (shiftDef) {
             if (shiftDef.type === 'absence') {
                if (shiftId === 'L4') { 
                    fillColor = [254, 226, 226]; // Red-100
                    textColor = [185, 28, 28];   // Red-700
                } 
                else if (shiftId === 'UW' || shiftId === 'UŻ' || shiftId === 'O') { 
                    fillColor = [254, 249, 195]; // Yellow-100
                    textColor = [133, 77, 14];   // Yellow-800/Brownish
                } 
                else { fillColor = [255, 255, 255]; textColor = [0,0,0]; }
             } else {
                 // Work shifts
                 if (shiftDef.start >= 13) {
                     // Brown (Stone-300ish) covers 13 and 14 start
                     fillColor = [214, 211, 209]; // Stone-300
                     textColor = [28, 25, 23];    // Stone-900
                 } else if (shiftDef.start === 11 || shiftDef.start === 12) {
                     // Light Brown (Amber-100)
                     fillColor = [254, 243, 199]; // Amber-100
                     textColor = [120, 53, 15];   // Amber-900
                 } else if (shiftDef.start === 10) {
                     // Orange
                     fillColor = [255, 237, 213]; // Orange-100
                     textColor = [154, 52, 18];   // Orange-800
                 } else {
                     // Green (8:00)
                     fillColor = [209, 250, 229]; // Emerald-100
                     textColor = [6, 95, 70];     // Emerald-800
                 }
             }
         }

         rowData.push({ 
             content: cellText, 
             styles: { 
                 fillColor: fillColor, 
                 textColor: textColor, 
                 halign: 'center', 
                 fontSize: override ? 6 : 7
             } 
         });
       });

       // Stats
       const stats = calculateEmployeeStats(emp, schedule, overrides, englishLessons, daysArray, year, month);
       rowData.push({ content: `${stats.totalHours}h`, styles: { halign: 'center', fontStyle: 'bold' } });

       body.push(rowData);
    });
  });

  // Generate Table
  autoTable(doc, {
    startY: 25,
    head: [headRow, dayNamesRow],
    body: body,
    theme: 'grid',
    styles: {
      font: 'Roboto', // Apply Custom Font
      fontSize: 8,
      cellPadding: 1,
      lineColor: [203, 213, 225] as [number, number, number], // Slate-300
      lineWidth: 0.1,
    },
    headStyles: {
      font: 'Roboto', // Apply Custom Font to Headers
      fontStyle: 'bold',
      fillColor: [241, 245, 249] as [number, number, number], // Slate-100
      textColor: [51, 65, 85] as [number, number, number],    // Slate-700
      lineWidth: 0.1,
      lineColor: [203, 213, 225] as [number, number, number]
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Employee Name
      // Dynamic columns for days will be auto-sized, but we can hint if needed
      [daysArray.length + 1]: { cellWidth: 15 } // Suma
    }
  });

  // --- LEGEND ---
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(9);
  doc.text('Legenda:', 14, finalY);
  finalY += 5;

  const legendItems = [
    { label: '08:00 start', color: [209, 250, 229] }, // Emerald (Green)
    { label: '10:00 start', color: [255, 237, 213] }, // Orange
    { label: '12:00 start', color: [254, 243, 199] }, // Amber (Light Brown)
    { label: '13:00 / 14:00', color: [214, 211, 209] }, // Stone (Brown)
    { label: 'Urlopy', color: [254, 249, 195] },        // Yellow
    { label: 'L4', color: [254, 226, 226] },            // Red
  ];

  let xPos = 14;
  legendItems.forEach(item => {
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(xPos, finalY - 3, 5, 5, 'F');
      doc.setTextColor(50, 50, 50);
      doc.text(item.label, xPos + 7, finalY + 1);
      xPos += 35;
  });

  // Save
  doc.save(`Grafik_Styczen_${year}.pdf`);
};
