
import React, { memo } from 'react';
import { GripVertical, AlertTriangle, MapPin, Pencil, Activity } from 'lucide-react';
import { ShiftCell } from './ShiftCell';
import { calculateEmployeeStats, getValidationWarnings, isWeekend } from '../utils';
import type { Employee, ShiftOverride } from '../types';

interface ScheduleRowProps {
  emp: Employee;
  year: number;
  month: number;
  daysArray: number[];
  daysInMonth: number;
  holidays: number[];
  schedule: Record<string, string>;
  overrides: Record<string, ShiftOverride>;
  notes: Record<string, string>;
  lockedCells: Record<string, boolean>;
  englishLessons: Record<string, boolean>;
  homeOffice: Record<string, boolean>;
  workingDays: number;
  draggedRowId: string | null;
  selectedCell: { empId: string, day: number } | null;
  editingCell: { empId: string, day: number } | null;
  copiedShift: { id: string } | null;
  
  // Handlers
  onEditEmployee: (emp: Employee) => void;
  onRowDragStart: (e: React.DragEvent, id: string) => void;
  onRowDragOver: (e: React.DragEvent) => void;
  onRowDrop: (e: React.DragEvent, id: string) => void;
  onUpdateShift: (empId: string, day: number, v: string) => void;
  onUpdateOverride: (empId: string, day: number, v: ShiftOverride | null) => void;
  onOpenCustomModal: (empId: string, day: number) => void;
  onSelect: (empId: string, day: number) => void;
  onEdit: (empId: string, day: number) => void;
  onCellDragStart: (e: React.DragEvent, empId: string, day: number) => void;
  onCellDragOver: (e: React.DragEvent) => void;
  onCellDrop: (e: React.DragEvent, empId: string, day: number) => void;
  onContextMenu: (e: React.MouseEvent, empId: string, day: number) => void;
  onKeyDown: (e: React.KeyboardEvent, empId: string, day: number) => void;
}

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
      'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 
      'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const ScheduleRowComponent: React.FC<ScheduleRowProps> = ({
  emp, year, month, daysArray, daysInMonth, holidays, 
  schedule, overrides, notes, lockedCells, englishLessons, homeOffice, workingDays,
  draggedRowId, selectedCell, editingCell, copiedShift,
  onEditEmployee, onRowDragStart, onRowDragOver, onRowDrop, 
  onUpdateShift, onUpdateOverride, onOpenCustomModal, onSelect, onEdit, 
  onCellDragStart, onCellDragOver, onCellDrop, onContextMenu, onKeyDown
}) => {
    
    const stats = calculateEmployeeStats(emp, schedule, overrides, englishLessons, daysArray, year, month);
    const isUoP = emp.contract === 'UoP';
    const systemHours = emp.workSystem === '8h' ? 8 : 7;
    const individualTarget = workingDays * systemHours;
    const progressPercent = Math.min((stats.totalHours / individualTarget) * 100, 100);

    const warningDetails: string[] = [];
    for(const d of daysArray) {
            const w = getValidationWarnings(emp, d, schedule[`${emp.id}-${d}`], schedule, overrides, daysInMonth);
            if(w.length > 0) {
                warningDetails.push(`Dzień ${d}: ${w.join(', ')}`);
            }
    }
    const hasAnyWarnings = warningDetails.length > 0;

    return (
        <tr className={`group hover:bg-slate-50/80 dark:hover:bg-gray-800/50 transition-colors ${draggedRowId === emp.id ? 'opacity-40 bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900'}`} draggable onDragStart={(e) => onRowDragStart(e, emp.id)} onDragOver={onRowDragOver} onDrop={(e) => onRowDrop(e, emp.id)}>
        <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-slate-50/80 dark:group-hover:bg-gray-800/50 border-r border-slate-200 dark:border-gray-800 p-3 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
            <div className="flex justify-between items-center gap-3">
            <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-gray-600 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors"><GripVertical className="w-4 h-4" /></div>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(emp.name)} shadow-sm ring-2 ring-white dark:ring-gray-800`}>{getInitials(emp.name)}</div>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate leading-tight">{emp.name}</span>
                        {hasAnyWarnings && (
                            <div className="text-red-500 dark:text-red-400 shrink-0 cursor-help" title={warningDetails.join('\n')}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-px rounded font-medium border ${isUoP ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-300' : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/50 dark:text-emerald-300'}`}>{emp.contract}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{emp.location}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1 border border-slate-100 dark:border-gray-700 rounded bg-slate-50 dark:bg-gray-800">{emp.workSystem}</span>
                    </div>
                </div>
            </div>
            <button onClick={() => onEditEmployee(emp)} className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all p-1.5 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
            </div>
        </td>
        {daysArray.map(day => (
            <ShiftCell 
                key={day} day={day} empId={emp.id} 
                shiftId={schedule[`${emp.id}-${day}`] || 'OFF'} 
                override={overrides[`${emp.id}-${day}`]}
                note={notes[`${emp.id}-${day}`]}
                isLocked={lockedCells[`${emp.id}-${day}`]}
                hasEnglish={englishLessons[`${emp.id}-${day}`]}
                hasHO={homeOffice[`${emp.id}-${day}`]}
                isWeekend={isWeekend(year, month, day)}
                isHoliday={holidays.includes(day)}
                warnings={getValidationWarnings(emp, day, schedule[`${emp.id}-${day}`], schedule, overrides, daysInMonth)}
                workSystem={emp.workSystem}
                isSelected={selectedCell?.empId===emp.id && selectedCell?.day===day}
                isEditing={editingCell?.empId===emp.id && editingCell?.day===day}
                isCopiedSource={selectedCell?.empId===emp.id && selectedCell?.day===day && copiedShift?.id === (schedule[`${emp.id}-${day}`]||'OFF')}
                onUpdateShift={(v) => onUpdateShift(emp.id, day, v)}
                onUpdateOverride={(v) => onUpdateOverride(emp.id, day, v)}
                onOpenCustomModal={() => onOpenCustomModal(emp.id, day)}
                onSelect={() => onSelect(emp.id, day)}
                onEdit={() => onEdit(emp.id, day)}
                onDragStart={(e) => onCellDragStart(e, emp.id, day)}
                onDragOver={onCellDragOver}
                onDrop={(e) => onCellDrop(e, emp.id, day)}
                onContextMenu={(e) => onContextMenu(e, emp.id, day)}
                onKeyDown={(e) => onKeyDown(e, emp.id, day)}
            />
        ))}
        <td className="sticky right-0 z-10 bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-gray-800 p-3 text-center group-hover:bg-slate-50/80 dark:group-hover:bg-gray-800/50 transition-colors shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
            <div className={`font-bold text-sm ${isUoP && stats.totalHours > individualTarget ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{stats.totalHours}h</div>
            {isUoP && (
            <>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full mt-1.5 mb-1 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${stats.totalHours > individualTarget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">/ {individualTarget}h</div>
            </>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-1.5"><Activity className={`w-3 h-3 ${stats.fatiguePoints > 25 ? 'text-rose-500' : 'text-slate-400 dark:text-gray-600'}`} /><span className="text-[10px] font-medium text-slate-400 dark:text-gray-500">{stats.fatiguePoints}</span></div>
        </td>
        </tr>
    );
};

export const ScheduleRow = memo(ScheduleRowComponent, (prev, next) => {
    // Custom comparison function for performance
    if (prev.emp.id !== next.emp.id) return false;
    if (prev.year !== next.year || prev.month !== next.month) return false;
    if (prev.workingDays !== next.workingDays) return false;
    if (prev.draggedRowId !== next.draggedRowId) return false;
    
    // Check cell selection/editing state
    const isPrevSelected = prev.selectedCell?.empId === prev.emp.id;
    const isNextSelected = next.selectedCell?.empId === next.emp.id;
    if (isPrevSelected !== isNextSelected) return false;
    if (isNextSelected && prev.selectedCell?.day !== next.selectedCell?.day) return false;
    
    const isPrevEditing = prev.editingCell?.empId === prev.emp.id;
    const isNextEditing = next.editingCell?.empId === next.emp.id;
    if (isPrevEditing !== isNextEditing) return false;

    // Check data specific to this employee
    const days = prev.daysArray;
    const empId = prev.emp.id;
    
    // We scan days to see if any relevant data changed
    // This looks O(D) but checks reference equality of values in map
    for (const day of days) {
        const key = `${empId}-${day}`;
        if (prev.schedule[key] !== next.schedule[key]) return false;
        if (prev.overrides[key] !== next.overrides[key]) return false;
        if (prev.notes[key] !== next.notes[key]) return false;
        if (prev.lockedCells[key] !== next.lockedCells[key]) return false;
        if (prev.englishLessons[key] !== next.englishLessons[key]) return false;
        if (prev.homeOffice[key] !== next.homeOffice[key]) return false;
    }
    
    // Check previous/next day schedule for validation warnings (11h rest rule depends on neighbors)
    // We need to check if neighbor shifts changed because it might affect THIS employee's warnings
    // Actually, neighbor shifts ARE in schedule[key] which we just checked.
    // So the loop above covers all dependencies for stats and warnings.

    return true;
});
