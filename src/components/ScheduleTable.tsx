
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Users, Trash, MessageSquare } from 'lucide-react';
import type { Employee, ShiftOverride } from '../types';
import { isWeekend, getDayName, checkStaffingLevels, getEffectiveShift } from '../utils';
import { CustomShiftModal } from './CustomShiftModal';
import { NoteModal } from './NoteModal';
import { ScheduleRow } from './ScheduleRow';

interface ScheduleTableProps {
  year: number;
  month: number;
  daysArray: number[];
  daysInMonth: number;
  holidays: number[];
  teams: string[];
  employees: Employee[];
  schedule: Record<string, string>;
  overrides: Record<string, ShiftOverride>;
  notes: Record<string, string>; 
  lockedCells: Record<string, boolean>;
  englishLessons: Record<string, boolean>;
  homeOffice: Record<string, boolean>;
  coverageStats: Record<number, Record<number, number>>;
  workingDays: number;
  onUpdateShift: (empId: string, day: number, shiftId: string) => void;
  onUpdateOverride: (empId: string, day: number, override: ShiftOverride | null) => void;
  onUpdateNote: (empId: string, day: number, note: string | null) => void; 
  onEditEmployee: (emp: Employee) => void;
  onReorderEmployee: (sourceId: string, targetId: string) => void;
  onMoveShift: (fromEmpId: string, fromDay: number, toEmpId: string, toDay: number) => void;
  onSwapShift: (empIdA: string, dayA: number, empIdB: string, dayB: number) => void; 
  onToggleLock: (empId: string, day: number) => void;
  onToggleEnglish: (empId: string, day: number) => void;
  onToggleHO: (empId: string, day: number) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  year, month, daysArray, daysInMonth, holidays, teams, employees, schedule, overrides, notes, lockedCells, englishLessons, homeOffice, coverageStats, workingDays,
  onUpdateShift, onUpdateOverride, onUpdateNote, onEditEmployee, onReorderEmployee, onMoveShift, onSwapShift, onToggleLock, onToggleEnglish, onToggleHO
}) => {
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{empId: string, day: number} | null>(null);
  const [editingCell, setEditingCell] = useState<{empId: string, day: number} | null>(null); 
  const [copiedShift, setCopiedShift] = useState<{id: string, override?: ShiftOverride, note?: string} | null>(null);
  const [customTimeModal, setCustomTimeModal] = useState<{isOpen: boolean, empId: string, day: number} | null>(null);
  const [noteModal, setNoteModal] = useState<{isOpen: boolean, empId: string, day: number} | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, empId: string, day: number} | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (tableRef.current && !tableRef.current.contains(target)) {
        setSelectedCell(null);
        setEditingCell(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Handlers wrapped in useCallback mostly to pass stable references if we wanted to enforce it, 
  // but since we rely on prop comparison in ScheduleRow, simple passthrough is fine.
  
  const handleRowDragStart = (e: React.DragEvent, id: string) => { setDraggedRowId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData('type', 'row'); };
  const handleRowDragOver = (e: React.DragEvent) => { e.preventDefault(); if (draggedRowId) e.dataTransfer.dropEffect = "move"; };
  const handleRowDrop = (e: React.DragEvent, targetId: string) => {
    if (e.dataTransfer.getData('type') === 'row' && draggedRowId && draggedRowId !== targetId) {
        onReorderEmployee(draggedRowId, targetId);
    }
    setDraggedRowId(null);
  };

  const handleCellDragStart = (e: React.DragEvent, empId: string, day: number) => {
    e.stopPropagation(); 
    if (lockedCells[`${empId}-${day}`] || !schedule[`${empId}-${day}`] || schedule[`${empId}-${day}`] === 'OFF') { e.preventDefault(); return; }
    setSelectedCell({ empId, day }); setEditingCell(null);
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData('type', 'cell'); e.dataTransfer.setData('payload', JSON.stringify({ empId, day }));
  };

  const handleCellDrop = (e: React.DragEvent, targetEmpId: string, targetDay: number) => {
    if (e.dataTransfer.getData('type') === 'cell' && !lockedCells[`${targetEmpId}-${targetDay}`]) {
        try { 
            const data = JSON.parse(e.dataTransfer.getData('payload'));
            const targetShift = schedule[`${targetEmpId}-${targetDay}`];
            if (targetShift && targetShift !== 'OFF') {
                if (data.empId !== targetEmpId || data.day !== targetDay) {
                     onSwapShift(data.empId, data.day, targetEmpId, targetDay);
                }
            } else {
                if (data.empId !== targetEmpId || data.day !== targetDay) {
                     onMoveShift(data.empId, data.day, targetEmpId, targetDay);
                }
            }
        } catch (err) {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, empId: string, day: number) => {
    const isLocked = lockedCells[`${empId}-${day}`];
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const s = schedule[`${empId}-${day}`], o = overrides[`${empId}-${day}`], n = notes[`${empId}-${day}`];
        if (s && s !== 'OFF') setCopiedShift({ id: s, override: o, note: n });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedShift && !isLocked) {
        onUpdateShift(empId, day, copiedShift.id); 
        onUpdateOverride(empId, day, copiedShift.override || null);
        onUpdateNote(empId, day, copiedShift.note || null);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isLocked) {
        onUpdateShift(empId, day, 'OFF'); onUpdateOverride(empId, day, null); onUpdateNote(empId, day, null);
    }
    if (e.key === 'Enter' && !isLocked) { e.preventDefault(); setEditingCell({ empId, day }); }
  };

  const employeesByTeam = React.useMemo(() => {
    const grouped: Record<string, Employee[]> = {};
    teams.forEach(team => grouped[team] = []);
    employees.forEach(emp => {
      if (grouped[emp.team] !== undefined) grouped[emp.team].push(emp);
      else { if (!grouped['Unassigned']) grouped['Unassigned'] = []; grouped['Unassigned'].push(emp); }
    });
    return grouped;
  }, [employees, teams]);

  return (
    <>
    <div ref={tableRef} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 flex-1 flex flex-col overflow-hidden min-h-[400px]">
      <div className="overflow-auto flex-1 relative custom-scrollbar">
        <table className="border-collapse w-full min-w-max">
          <thead className="bg-slate-50 dark:bg-gray-800 sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-gray-700">
            <tr>
              <th className="sticky left-0 z-50 bg-slate-50 dark:bg-gray-800 border-b border-r border-slate-200 dark:border-gray-700 p-3 text-left w-64 min-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pracownik</span>
              </th>
              {daysArray.map(day => {
                const isWk = isWeekend(year, month, day);
                const isHol = holidays.includes(day);
                const staffing = checkStaffingLevels(coverageStats[day] || {}, isWk);
                
                let headerBg = isWk || isHol ? 'bg-slate-100 dark:bg-gray-750' : 'bg-slate-50 dark:bg-gray-800';
                let headerText = new Date(year, month, day).getDay() === 0 || isHol ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300';
                
                if (!staffing.valid) {
                    headerBg = 'bg-red-50 dark:bg-red-900/20';
                    headerText = 'text-red-700 dark:text-red-400';
                }

                return (
                  <th key={day} className={`border-b border-r border-slate-200/60 dark:border-gray-700/60 p-1.5 min-w-[42px] text-center relative group ${headerBg}`}>
                    <div className={`text-xs font-bold ${headerText}`}>
                        {day}
                        {!staffing.valid && <div className="absolute top-0.5 right-0.5 text-red-500 dark:text-red-400"><Users className="w-2 h-2" /></div>}
                    </div>
                    <div className="text-[9px] uppercase tracking-wide opacity-70 dark:text-slate-400">{getDayName(year, month, day)}</div>
                    {!staffing.valid && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-32 p-2 bg-red-600 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            {staffing.messages.map((m,i)=><div key={i}>{m}</div>)}
                        </div>
                    )}
                  </th>
                );
              })}
              <th className="sticky right-0 z-50 bg-slate-50 dark:bg-gray-800 border-b border-l border-slate-200 dark:border-gray-700 p-3 w-28 text-center shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suma</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
            {teams.map(team => {
              const teamEmps = employeesByTeam[team] || [];
              if (teamEmps.length === 0) return null;
              const isCollapsed = collapsedTeams[team];
              return (
                <React.Fragment key={team}>
                  <tr className="bg-slate-100/80 dark:bg-gray-800/80 hover:bg-slate-200/80 dark:hover:bg-gray-700 cursor-pointer transition-colors" onClick={() => setCollapsedTeams(p=>({...p, [team]: !p[team]}))}>
                    <td colSpan={daysInMonth + 2} className="sticky left-0 z-20 bg-slate-100 dark:bg-gray-800/90 border-y border-slate-200 dark:border-gray-700 p-2 pl-4 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
                        <div className="flex items-center gap-2">
                             {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                             {team} <span className="ml-2 px-1.5 py-0.5 bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px]">{teamEmps.length}</span>
                        </div>
                    </td>
                  </tr>
                  {!isCollapsed && teamEmps.map(emp => (
                      <ScheduleRow
                        key={emp.id}
                        emp={emp}
                        year={year} month={month} daysArray={daysArray} daysInMonth={daysInMonth} holidays={holidays}
                        schedule={schedule} overrides={overrides} notes={notes} lockedCells={lockedCells} englishLessons={englishLessons} homeOffice={homeOffice} workingDays={workingDays}
                        draggedRowId={draggedRowId} selectedCell={selectedCell} editingCell={editingCell} copiedShift={copiedShift}
                        onEditEmployee={onEditEmployee}
                        onRowDragStart={handleRowDragStart} onRowDragOver={handleRowDragOver} onRowDrop={handleRowDrop}
                        onUpdateShift={onUpdateShift} onUpdateOverride={onUpdateOverride}
                        onOpenCustomModal={(e,d) => setCustomTimeModal({isOpen: true, empId: e, day: d})}
                        onSelect={(e,d) => setSelectedCell({empId: e, day: d})}
                        onEdit={(e,d) => setEditingCell({empId: e, day: d})}
                        onCellDragStart={handleCellDragStart} onCellDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onCellDrop={handleCellDrop}
                        onContextMenu={(e, empId, day) => { e.preventDefault(); setContextMenu({x: e.clientX, y: e.clientY, empId, day}); }}
                        onKeyDown={handleKeyDown}
                      />
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div ref={contextMenuRef} className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1 w-48 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50">Opcje</div>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-900/30 flex items-center gap-2" onClick={() => { setNoteModal({ isOpen: true, empId: contextMenu.empId, day: contextMenu.day }); setContextMenu(null); }}>
                 <MessageSquare className="w-4 h-4 text-indigo-500" /> Edytuj notatkę
            </button>
            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 flex items-center gap-2" onClick={() => { onToggleHO(contextMenu.empId, contextMenu.day); setContextMenu(null); }}>{homeOffice[`${contextMenu.empId}-${contextMenu.day}`] ? "Usuń HO" : "Home Office"}</button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2" onClick={() => { onToggleEnglish(contextMenu.empId, contextMenu.day); setContextMenu(null); }}>{englishLessons[`${contextMenu.empId}-${contextMenu.day}`] ? "Usuń Angielski" : "Angielski"}</button>
            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2" onClick={() => { onToggleLock(contextMenu.empId, contextMenu.day); setContextMenu(null); }}>{lockedCells[`${contextMenu.empId}-${contextMenu.day}`] ? "Odblokuj" : "Zablokuj"}</button>
            {!lockedCells[`${contextMenu.empId}-${contextMenu.day}`] && <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2" onClick={() => { onUpdateShift(contextMenu.empId, contextMenu.day, 'OFF'); onUpdateOverride(contextMenu.empId, contextMenu.day, null); onUpdateNote(contextMenu.empId, contextMenu.day, null); setContextMenu(null); }}><Trash className="w-4 h-4" /> Wyczyść</button>}
        </div>
      )}
      
      {customTimeModal && (
          <CustomShiftModal 
            isOpen={customTimeModal.isOpen} onClose={() => setCustomTimeModal(null)}
            initialStart={overrides[`${customTimeModal.empId}-${customTimeModal.day}`]?.start || getEffectiveShift(schedule[`${customTimeModal.empId}-${customTimeModal.day}`], employees.find(e=>e.id===customTimeModal.empId)?.workSystem).start}
            initialEnd={overrides[`${customTimeModal.empId}-${customTimeModal.day}`]?.end || getEffectiveShift(schedule[`${customTimeModal.empId}-${customTimeModal.day}`], employees.find(e=>e.id===customTimeModal.empId)?.workSystem).end}
            onSave={(override) => onUpdateOverride(customTimeModal.empId, customTimeModal.day, override)}
          />
      )}

      {noteModal && (
          <NoteModal
            isOpen={noteModal.isOpen}
            onClose={() => setNoteModal(null)}
            onSave={(note) => onUpdateNote(noteModal.empId, noteModal.day, note)}
            initialNote={notes[`${noteModal.empId}-${noteModal.day}`]}
            empName={employees.find(e => e.id === noteModal.empId)?.name || 'Pracownik'}
            day={noteModal.day}
          />
      )}
    </div>
    </>
  );
};
