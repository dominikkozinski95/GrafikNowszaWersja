
import React, { memo } from 'react';
import { Clock, AlertTriangle, Lock, Home, GraduationCap, MessageSquare } from 'lucide-react';
import { SHIFTS } from '../constants';
import { getEffectiveShift, decimalToTime } from '../utils';
import type { ShiftOverride, WorkSystemType } from '../types';

interface ShiftCellProps {
  day: number;
  empId: string;
  shiftId: string;
  override?: ShiftOverride;
  note?: string; 
  isLocked: boolean;
  hasEnglish: boolean;
  hasHO: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  warnings: string[];
  workSystem: WorkSystemType;
  isSelected: boolean;
  isEditing: boolean;
  isCopiedSource: boolean;
  onUpdateShift: (val: string) => void;
  onUpdateOverride: (val: ShiftOverride | null) => void;
  onOpenCustomModal: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const ShiftCell: React.FC<ShiftCellProps> = memo(({
  shiftId, override, note, isLocked, hasEnglish, hasHO, isWeekend, isHoliday, warnings, workSystem,
  isSelected, isEditing, isCopiedSource,
  onUpdateShift, onUpdateOverride, onOpenCustomModal, onSelect, onEdit,
  onDragStart, onDragOver, onDrop, onContextMenu, onKeyDown
}) => {
  const hasWarnings = warnings.length > 0;
  const is8h = workSystem === '8h';
  
  // Filter shifts based on work system rules
  const validStarts = is8h ? [8, 10, 12, 13] : [8, 10, 12, 14];
  
  const workShifts = SHIFTS.filter(s => 
      s.type === 'work' && validStarts.includes(s.start)
  );
  const absenceShifts = SHIFTS.filter(s => s.type === 'absence' && s.id !== 'OFF');

  const getCellStyle = () => {
    // Base styles: default border
    let style = 'border border-slate-100 dark:border-gray-800 transition-all';

    // Selection States
    if (isSelected) {
        style = 'ring-2 ring-indigo-500 z-20 border-transparent shadow-md';
        if (isCopiedSource) {
             style = 'ring-2 ring-dashed ring-indigo-400 z-20 border-transparent opacity-80';
        }
    }

    // Validation Warnings
    if (hasWarnings && !isLocked) {
      return `${style} bg-red-50 text-red-800 border-red-300 border-2 font-semibold dark:bg-red-900/30 dark:text-red-200 dark:border-red-800`;
    }

    // Locked State
    if (isLocked) {
        // Overlay look is handled by icon, but we darken bg
        style += ' bg-slate-50/80 dark:bg-gray-800/80 opacity-90'; 
    }

    // --- Shift Color Logic ---

    // Empty / OFF
    if (shiftId === 'OFF') {
      if (isHoliday) return `${style} bg-rose-50/50 dark:bg-rose-900/10 text-rose-300 dark:text-rose-800`;
      if (isWeekend) return `${style} bg-slate-50 dark:bg-gray-800/50 text-slate-300 dark:text-gray-700`;
      return `${style} bg-white dark:bg-gray-900 text-slate-200 dark:text-gray-800`;
    }

    // Override (Manual Time)
    if (override) {
         style += ' border-dashed border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50';
         return `${style} text-amber-800 dark:text-amber-200 font-bold`;
    }

    const shift = SHIFTS.find(s => s.id === shiftId);
    if (!shift) return 'bg-white dark:bg-gray-900'; // Fallback

    // Absences
    // L4 -> Red
    if (shiftId === 'L4') {
        return `${style} bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800/50 font-medium`;
    }
    // Urlopy (UW, UŻ, O) -> Yellow
    if (shiftId === 'UW' || shiftId === 'UŻ' || shiftId === 'O') {
        return `${style} bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/50 font-medium`;
    }
    
    // Work Shifts
    // 8:00 -> Green
    if (shift.start === 8) {
        return `${style} bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50 font-medium`;
    }
    // 10:00 -> Orange
    if (shift.start === 10) {
        return `${style} bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50 font-medium`;
    }
    // 11:00 / 12:00 -> Light Brown (Amber/Sand)
    if (shift.start === 11 || shift.start === 12) {
        return `${style} bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50 font-medium`;
    }
    // 13:00 / 14:00+ -> Brown (Stone/Taupe)
    if (shift.start >= 13) {
        return `${style} bg-stone-300 text-stone-900 border-stone-400 dark:bg-stone-700 dark:text-stone-200 dark:border-stone-600 font-medium`;
    }
    
    // Default fallback
    return `${style} bg-slate-50 text-slate-700 border-slate-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700`;
  };

  const shiftDef = SHIFTS.find(s => s.id === shiftId);
  const effectiveShift = getEffectiveShift(shiftId, workSystem);
  
  const displayLabel = (shiftDef?.type === 'work' && shiftId !== 'OFF') 
       ? `${effectiveShift.start}-${effectiveShift.end}` 
       : (shiftId === 'OFF' ? '' : shiftId);

  return (
     <td 
        className={`border-r border-slate-100 dark:border-gray-800 p-0.5 relative align-top bg-white dark:bg-gray-900 group/td`}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={onContextMenu}
     >
       <div 
            className={`w-full h-9 rounded flex items-center justify-center cursor-pointer ${getCellStyle()} group/cell select-none relative overflow-hidden`}
            draggable={!isEditing && shiftId !== 'OFF' && !isLocked}
            onDragStart={onDragStart}
            onClick={onSelect}
            onDoubleClick={onEdit}
            tabIndex={0}
            onKeyDown={onKeyDown}
            title={note || undefined}
       >
           {isEditing ? (
             <div className="flex w-full h-full">
                 <select
                    autoFocus
                    className="w-full h-full text-xs bg-white dark:bg-gray-800 text-black dark:text-white text-center outline-none border-2 border-indigo-500 rounded-l"
                    value={shiftId}
                    onChange={(e) => {
                        onUpdateShift(e.target.value);
                        if (e.target.value === 'OFF') onUpdateOverride(null);
                    }}
                    onClick={(e) => e.stopPropagation()} 
                 >
                     <option value="OFF">-</option>
                     <optgroup label="Praca">
                        {workShifts.map(s => {
                          const effShift = getEffectiveShift(s.id, workSystem);
                          return <option key={s.id} value={s.id}>{`${effShift.start}-${effShift.end}`}</option>
                        })}
                     </optgroup>
                     <optgroup label="Nieobecności">
                         {absenceShifts.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                     </optgroup>
                 </select>
                 {shiftId !== 'OFF' && !SHIFTS.find(s=>s.id === shiftId)?.type?.includes('absence') && (
                    <button 
                        className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-1 rounded-r border-y-2 border-r-2 border-indigo-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenCustomModal();
                        }}
                    >
                        <Clock className="w-3 h-3" />
                    </button>
                 )}
             </div>
           ) : (
             <>
                {override ? (
                    <div className="flex flex-col leading-none items-center justify-center">
                        <span className="text-[9px] opacity-80">{decimalToTime(override.start)}</span>
                        <div className="h-px w-3 bg-amber-400/50 my-px"></div>
                        <span className="text-[9px] opacity-80">{decimalToTime(override.end)}</span>
                    </div>
                ) : (
                    <span className="text-[10px] tracking-tight">{displayLabel}</span>
                )}

                {/* Markers Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Top Right: Holiday/Warning */}
                    {isHoliday && shiftId !== 'OFF' && !hasWarnings && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-sm"></div>
                    )}
                    {hasWarnings && !isLocked && (
                        <div className="absolute top-0 right-0 p-0.5 text-red-500 dark:text-red-400 bg-white/80 dark:bg-gray-900/80 rounded-bl-md shadow-sm backdrop-blur-[1px]">
                             <AlertTriangle className="w-2.5 h-2.5" />
                        </div>
                    )}
                    
                    {/* Top Left: Note */}
                    {note && (
                        <div className="absolute top-0 left-0 p-0.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-gray-800/80 rounded-br-md shadow-sm backdrop-blur-[1px]">
                             <MessageSquare className="w-2 h-2" fill="currentColor" fillOpacity={0.2} />
                        </div>
                    )}

                    {/* Bottom Left: Indicators Stack */}
                    <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5">
                        {hasHO && <Home className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400 opacity-90" strokeWidth={2.5} />}
                        {hasEnglish && <GraduationCap className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 opacity-90" strokeWidth={2.5} />}
                    </div>

                    {/* Bottom Right: Lock */}
                    {isLocked && (
                        <div className="absolute bottom-0.5 right-0.5 text-slate-400 dark:text-gray-500 opacity-70">
                            <Lock className="w-2.5 h-2.5" />
                        </div>
                    )}
                </div>
                
                {/* Hover Note Tooltip */}
                {note && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-[60] w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity">
                        <div className="font-bold mb-0.5 text-indigo-200">Notatka:</div>
                        {note}
                    </div>
                )}
             </>
           )}
       </div>
     </td>
  );
});

ShiftCell.displayName = 'ShiftCell';
