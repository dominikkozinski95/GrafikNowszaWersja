
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Calendar, RefreshCw, UserPlus, Settings, Activity, Trash2, Download, Upload, Save, Lock, GraduationCap, Home, FileText, Search, Filter, X, ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';

import type { ContractType, LocationType, Employee, WorkSystemType, ShiftOverride, GenerationType } from './types';
import { INITIAL_TEAMS, INITIAL_EMPLOYEES, MONTH_NAMES } from './constants';
import { getDaysInMonth, getHolidays, getEffectiveShift, calculateEmployeeStats, getShiftById, generateSchedulePDF, getMonthlyWorkingDays } from './utils';
import { usePersistentState } from './hooks';
import { generateScheduleLogic } from './generator';

// Components
import { ScheduleTable } from './components/ScheduleTable';
import { CoverageTable } from './components/CoverageTable';
import { EmployeeModal } from './components/EmployeeModal';
import { TeamModal } from './components/TeamModal';

const App = () => {
  // Calendar State
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(0); // 0 = January

  // Theme State - Initialize based on DOM class (set by index.html script)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // Direct DOM manipulation for instant feedback
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scheduler_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scheduler_theme', 'light');
    }
  };

  // --- STATE MANAGEMENT via Hook ---
  const [employees, setEmployees] = usePersistentState<Employee[]>('scheduler_employees', INITIAL_EMPLOYEES);
  const [teams, setTeams] = usePersistentState<string[]>('scheduler_teams', INITIAL_TEAMS);
  
  const [schedule, setSchedule] = usePersistentState<Record<string, string>>('scheduler_schedule', {});
  const [overrides, setOverrides] = usePersistentState<Record<string, ShiftOverride>>('scheduler_overrides', {});
  const [notes, setNotes] = usePersistentState<Record<string, string>>('scheduler_notes', {}); // New State
  const [lockedCells, setLockedCells] = usePersistentState<Record<string, boolean>>('scheduler_locked', {});
  const [englishLessons, setEnglishLessons] = usePersistentState<Record<string, boolean>>('scheduler_english', {});
  const [homeOffice, setHomeOffice] = usePersistentState<Record<string, boolean>>('scheduler_ho', {});

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTeamFilter, setActiveTeamFilter] = useState<string>('Wszyscy');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState<{original: string, current: string} | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  
  // Form State
  const [empForm, setEmpForm] = useState({
    name: '',
    team: '',
    contract: 'UoP' as ContractType,
    location: 'Katowice' as LocationType,
    workSystem: '7h' as WorkSystemType,
    generationType: undefined as GenerationType | undefined
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived Values
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const holidays = useMemo(() => getHolidays(year, month), [year, month]);
  
  const monthlyWorkingDays = useMemo(() => getMonthlyWorkingDays(year, month), [year, month]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: Employee) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = activeTeamFilter === 'Wszyscy' || emp.team === activeTeamFilter;
      return matchesSearch && matchesTeam;
    });
  }, [employees, searchQuery, activeTeamFilter]);

  const coverageStats = useMemo(() => {
    const stats: Record<number, Record<number, number>> = {};
    daysArray.forEach(day => {
      stats[day] = {};
      for (let h = 8; h <= 20; h++) stats[day][h] = 0;
    });

    employees.forEach((emp: Employee) => {
      daysArray.forEach(day => {
        const shiftId = schedule[`${emp.id}-${day}`];
        if (shiftId && shiftId !== 'OFF') {
          const override = overrides[`${emp.id}-${day}`];
          const shift = getEffectiveShift(shiftId, emp.workSystem, override);
          if (shift.type === 'absence') return;
          for (let h = 8; h <= 20; h++) {
            if (h >= shift.start && h < shift.end) stats[day][h]++;
          }
        }
      });
    });
    return stats;
  }, [schedule, employees, daysArray, overrides]);

  // --- ACTIONS ---

  const handleAutoGenerate = () => {
    const newSchedule = generateScheduleLogic({
      employees,
      schedule,
      overrides,
      lockedCells,
      englishLessons,
      year,
      month,
      workingDays: monthlyWorkingDays
    });
    setSchedule(newSchedule);
  };

  const handleDeleteEmployee = () => {
    if (!editingId) return;
    setEmployees((prev) => prev.filter(e => e.id !== editingId));
    
    const cleanupState = (setter: any, currentObj: any) => {
         const newObj = { ...currentObj };
         Object.keys(newObj).forEach(key => {
             if (key.startsWith(`${editingId}-`)) {
                 delete newObj[key];
             }
         });
         setter(newObj);
    };

    cleanupState(setSchedule, schedule);
    cleanupState(setOverrides, overrides);
    cleanupState(setNotes, notes);
    cleanupState(setLockedCells, lockedCells);
    cleanupState(setEnglishLessons, englishLessons);
    cleanupState(setHomeOffice, homeOffice);

    setIsModalOpen(false);
  };

  const handleExportJSON = () => {
    const data = {
      version: 1, date: new Date().toISOString(),
      year, month,
      employees, teams, schedule, overrides, notes, lockedCells, englishLessons, homeOffice
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Grafik_${year}_${month+1}_Backup.json`;
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.employees && data.schedule) {
          if (confirm('Import nadpisze obecny grafik. Czy kontynuować?')) {
            setEmployees(data.employees);
            setTeams(data.teams || INITIAL_TEAMS);
            setSchedule(data.schedule);
            setOverrides(data.overrides || {});
            setNotes(data.notes || {});
            setLockedCells(data.lockedCells || {});
            setEnglishLessons(data.englishLessons || {});
            setHomeOffice(data.homeOffice || {});
            if (data.year) setYear(data.year);
            if (data.month !== undefined) setMonth(data.month);
            alert('Dane zostały przywrócone pomyślnie!');
          }
        } else { alert('Nieprawidłowy format pliku.'); }
      } catch (err) { alert('Błąd podczas odczytu pliku.'); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ['Imię i Nazwisko', 'Zespół', 'Umowa', 'Lokalizacja', ...daysArray.map(d => `${d}.${month + 1}`), 'Suma Godzin'];
    const rows = employees.map((emp: Employee) => {
      const stats = calculateEmployeeStats(emp, schedule, overrides, englishLessons, daysArray, year, month);
      const rowData = [
        emp.name, emp.team, emp.contract, emp.location,
        ...daysArray.map(d => schedule[`${emp.id}-${d}`] || ''),
        stats.totalHours.toString()
      ];
      return rowData.map(field => `"${field}"`).join(';');
    });
    const blob = new Blob(['\uFEFF' + [headers.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Grafik_${year}_${month+1}.csv`;
    link.click();
  };

  const handleClearSchedule = () => {
    if (confirm('Czy na pewno chcesz wyczyścić grafik?')) {
      const newSchedule = { ...schedule };
      const newEnglish = { ...englishLessons };
      const newHO = { ...homeOffice };
      const newNotes = { ...notes };

      employees.forEach((emp: Employee) => {
          daysArray.forEach(day => {
              const key = `${emp.id}-${day}`;
              if (lockedCells[key]) return;
              if (overrides[key]) return;
              const currentShiftId = newSchedule[key];
              if (currentShiftId) {
                  const shiftDef = getShiftById(currentShiftId);
                  if (shiftDef.type === 'absence') return;
              }
              delete newSchedule[key];
              delete newEnglish[key];
              delete newHO[key];
              delete newNotes[key];
          });
      });
      setSchedule(newSchedule);
      setEnglishLessons(newEnglish);
      setHomeOffice(newHO);
      setNotes(newNotes);
    }
  };

  const updateShift = (empId: string, day: number, shiftId: string) => {
    const key = `${empId}-${day}`;
    if (lockedCells[key]) return;
    
    setSchedule(prev => ({ ...prev, [key]: shiftId }));

    if (shiftId === 'OFF') {
        setEnglishLessons(prev => { const { [key]: _, ...rest } = prev; return rest; });
        setHomeOffice(prev => { const { [key]: _, ...rest } = prev; return rest; });
    }
  };

  const toggleSetState = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, 
    empId: string, 
    day: number
  ) => {
     setter((prev: Record<string, boolean>) => {
        const key = `${empId}-${day}`;
        if (prev[key]) {
            const { [key]: _, ...rest } = prev;
            return rest;
        }
        return { ...prev, [key]: true };
     });
  };

  // Change Month Handlers
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 shadow-sm z-20">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            
            {/* Month Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
               <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
               <div className="px-3 font-semibold text-sm min-w-[140px] text-center">{MONTH_NAMES[month]} {year}</div>
               <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center">
             <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full transition-all">
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button onClick={() => setIsTeamModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md text-sm font-medium"><Settings className="w-4 h-4" /> Zespoły</button>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-md border border-slate-200 dark:border-gray-700">
               <button onClick={handleExportJSON} className="p-1.5 hover:text-indigo-600" title="Zapisz"><Save className="w-4 h-4" /></button>
               <label className="p-1.5 hover:text-indigo-600 cursor-pointer" title="Wczytaj"><Upload className="w-4 h-4" /><input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" /></label>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button onClick={() => { setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium shadow-sm"><UserPlus className="w-4 h-4" /> Dodaj</button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200 rounded-md text-sm font-medium"><Download className="w-4 h-4" /> CSV</button>
             <button onClick={() => generateSchedulePDF(year, month, daysArray, employees, teams, schedule, overrides, englishLessons, holidays)} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200 rounded-md text-sm font-medium"><FileText className="w-4 h-4" /> PDF</button>
            <button onClick={handleAutoGenerate} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm"><RefreshCw className="w-4 h-4" /> Generuj</button>
            <div className="flex gap-1 ml-1">
              <button onClick={handleClearSchedule} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 rounded-l-md text-sm font-medium">Wyczyść</button>
              <button onClick={() => { if(confirm('HARD RESET?')) { localStorage.clear(); window.location.reload(); }}} className="px-2 py-2 bg-white dark:bg-gray-800 border-y border-r border-gray-300 dark:border-gray-700 hover:bg-red-50 text-red-600 rounded-r-md"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 items-center justify-center md:justify-start">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
              <span>Dni robocze w {MONTH_NAMES[month]}: <strong>{monthlyWorkingDays}</strong> (Cel: {monthlyWorkingDays*8}h dla 8h / {monthlyWorkingDays*7}h dla 7h)</span>
           </div>
           <div className="hidden md:block w-px h-3 bg-gray-300 dark:bg-gray-700"></div>
           <div className="flex items-center gap-2"><Lock className="w-3 h-3 text-rose-500" /> <span>Prawy Przycisk: Blokuj / HO / Angielski / Notatki</span></div>
           <div className="hidden md:block w-px h-3 bg-gray-300 dark:bg-gray-700"></div>
           <div className="flex items-center gap-2"><Activity className="w-3 h-3 text-gray-500 dark:text-gray-400" /> <span>Zmęczenie: +2pkt Weekend, +1pkt Popołudnie</span></div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col p-4 md:p-6 gap-6">
        {/* FILTER TOOLBAR */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input type="text" placeholder="Szukaj pracownika..." className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-3 h-3" /></button>}
           </div>
           <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              <div className="flex items-center gap-1.5 px-2 text-gray-500 text-xs font-semibold uppercase tracking-wide shrink-0"><Filter className="w-3 h-3" /> Zespół:</div>
              <button onClick={() => setActiveTeamFilter('Wszyscy')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${activeTeamFilter === 'Wszyscy' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>Wszyscy</button>
              {teams.map(team => (
                 <button key={team} onClick={() => setActiveTeamFilter(team)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${activeTeamFilter === team ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>{team}</button>
              ))}
           </div>
        </div>

        <ScheduleTable 
          year={year} month={month} daysArray={daysArray} daysInMonth={daysInMonth} holidays={holidays}
          teams={teams} employees={filteredEmployees} schedule={schedule} overrides={overrides} notes={notes} lockedCells={lockedCells} englishLessons={englishLessons} homeOffice={homeOffice}
          coverageStats={coverageStats}
          workingDays={monthlyWorkingDays}
          onUpdateShift={updateShift} 
          onUpdateOverride={(empId: string, day: number, ov: ShiftOverride | null) => { if(lockedCells[`${empId}-${day}`]) return; setOverrides((p: Record<string, ShiftOverride>) => { const k = `${empId}-${day}`; return ov ? {...p, [k]: ov} : (({[k]:_,...r})=>r)(p); })}}
          onUpdateNote={(empId: string, day: number, note: string | null) => { if(lockedCells[`${empId}-${day}`]) return; setNotes((p: Record<string, string>) => { const k = `${empId}-${day}`; return note ? {...p, [k]: note} : (({[k]:_,...r})=>r)(p); })}}
          onEditEmployee={(emp: Employee) => { setEditingId(emp.id); setEmpForm({ ...emp, generationType: emp.generationType }); setIsModalOpen(true); }}
          onReorderEmployee={(sId: string, tId: string) => {
             setEmployees((prev: Employee[]) => {
                const sIdx = prev.findIndex(e=>e.id===sId), tIdx = prev.findIndex(e=>e.id===tId);
                if(sIdx<0||tIdx<0) return prev;
                const list = [...prev]; const [moved] = list.splice(sIdx, 1); list.splice(tIdx, 0, moved);
                return list;
             })
          }}
          onMoveShift={(fromId: string, fromD: number, toId: string, toD: number) => {
             if(lockedCells[`${fromId}-${fromD}`] || lockedCells[`${toId}-${toD}`]) return;
             const sId = schedule[`${fromId}-${fromD}`], ov = overrides[`${fromId}-${fromD}`], nt = notes[`${fromId}-${fromD}`];
             if(!sId || sId==='OFF') return;
             
             // Move to target
             updateShift(toId, toD, sId);
             setOverrides(p => ov ? {...p, [`${toId}-${toD}`]: ov} : p);
             setNotes(p => nt ? {...p, [`${toId}-${toD}`]: nt} : p);

             // Clear source
             updateShift(fromId, fromD, 'OFF');
             setOverrides(p => { const {[ `${fromId}-${fromD}` ]:_,...r}=p; return r;});
             setNotes(p => { const {[ `${fromId}-${fromD}` ]:_,...r}=p; return r;});
          }}
          onSwapShift={(idA: string, dA: number, idB: string, dB: number) => {
              if(lockedCells[`${idA}-${dA}`] || lockedCells[`${idB}-${dB}`]) return;
              
              const shiftA = schedule[`${idA}-${dA}`], ovA = overrides[`${idA}-${dA}`], ntA = notes[`${idA}-${dA}`];
              const shiftB = schedule[`${idB}-${dB}`], ovB = overrides[`${idB}-${dB}`], ntB = notes[`${idB}-${dB}`];

              // Swap Core Shifts
              updateShift(idA, dA, shiftB || 'OFF');
              updateShift(idB, dB, shiftA || 'OFF');

              // Swap Overrides
              setOverrides(prev => {
                  const next = { ...prev };
                  if (ovA) next[`${idB}-${dB}`] = ovA; else delete next[`${idB}-${dB}`];
                  if (ovB) next[`${idA}-${dA}`] = ovB; else delete next[`${idA}-${dA}`];
                  return next;
              });

              // Swap Notes
              setNotes(prev => {
                  const next = { ...prev };
                  if (ntA) next[`${idB}-${dB}`] = ntA; else delete next[`${idB}-${dB}`];
                  if (ntB) next[`${idA}-${dA}`] = ntB; else delete next[`${idA}-${dA}`];
                  return next;
              });
          }}
          onToggleLock={(id: string, d: number) => toggleSetState(setLockedCells, id, d)}
          onToggleEnglish={(id: string, d: number) => toggleSetState(setEnglishLessons, id, d)}
          onToggleHO={(id: string, d: number) => toggleSetState(setHomeOffice, id, d)}
        />
        <CoverageTable coverageStats={coverageStats} daysArray={daysArray} year={year} month={month} holidays={holidays} />

        {/* Legend */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-gray-800">
           <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">Legenda</h3>
           <div className="flex flex-wrap gap-3 text-xs">
              <div className="px-2 py-1 rounded border font-medium bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">8:00 start</div>
              <div className="px-2 py-1 rounded border font-medium bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50">10:00 start</div>
              <div className="px-2 py-1 rounded border font-medium bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50">11:00 / 12:00 start</div>
              <div className="px-2 py-1 rounded border font-medium bg-stone-300 text-stone-900 border-stone-400 dark:bg-stone-700 dark:text-stone-200 dark:border-stone-600">13:00 / 14:00 start</div>
              <div className="px-2 py-1 rounded border font-medium bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/50">Urlopy (UW, UŻ, O)</div>
              <div className="px-2 py-1 rounded border font-medium bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800/50">L4</div>
              
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

              <div className="px-2 py-1 rounded border border-dashed border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-600 font-bold">Edytowana</div>
              <div className="px-2 py-1 rounded border border-indigo-100 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Angielski</div>
              <div className="px-2 py-1 rounded border border-teal-100 bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 flex items-center gap-1"><Home className="w-3 h-3" /> HO</div>
           </div>
        </div>
      </main>

      <EmployeeModal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          onSubmit={(e) => {
              e.preventDefault(); if(!empForm.name.trim()) return;
              if(editingId) setEmployees((p: Employee[]) => p.map(emp => emp.id===editingId ? {...emp, ...empForm} : emp));
              else setEmployees((p: Employee[]) => [...p, {id: (Math.max(0, ...p.map(x=>parseInt(x.id)))+1).toString(), ...empForm}]);
              setIsModalOpen(false);
          }}
          onDelete={handleDeleteEmployee}
          isEditing={!!editingId} teams={teams} formData={empForm} setFormData={setEmpForm} 
      />
      
      <TeamModal 
        isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)}
        teams={teams} editingTeamName={editingTeamName} setEditingTeamName={setEditingTeamName}
        newTeamName={newTeamName} setNewTeamName={setNewTeamName}
        onRename={() => {
            if(!editingTeamName?.current.trim()) return;
            const {original, current} = editingTeamName;
            if(teams.includes(current)) return alert('Istnieje!');
            setTeams((p: string[]) => p.map(t => t===original ? current : t));
            setEmployees((p: Employee[]) => p.map(e => e.team===original ? {...e, team: current} : e));
            setEditingTeamName(null);
        }}
        onAdd={(e) => { e.preventDefault(); if(!newTeamName.trim() || teams.includes(newTeamName.trim())) return; setTeams([...teams, newTeamName.trim()]); setNewTeamName(''); }}
        onDelete={(t) => { if(employees.some((e: Employee)=>e.team===t)) return alert('Zespół ma pracowników!'); setTeams((p: string[]) => p.filter(x => x!==t)); }}
      />
    </div>
  );
};
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
