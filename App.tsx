import React, { useState, useEffect } from 'react';
import { INITIAL_STAFF } from './constants';
import { Employee, ScheduleResult, RotationGroup, ScheduleHistoryItem } from './types';
import { Scheduler } from './services/scheduler';
import { analyzeSchedule } from './services/geminiService';
import CalendarView from './components/CalendarView';
import StatsPanel from './components/StatsPanel';
import StaffManager from './components/StaffManager';
import { Calendar, RefreshCw, Wand2, ShieldAlert, Star, Users, Settings2, History, Archive, Trash2, Coffee, Link2 } from 'lucide-react';

export default function App() {
  // Initialize employees from localStorage if available, otherwise use INITIAL_STAFF
  const [employees, setEmployees] = useState<Employee[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('staff_data');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved staff data", e);
            }
        }
    }
    return INITIAL_STAFF;
  });

  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1); // 0-indexed, so 1 is February
  const [specialHolidays, setSpecialHolidays] = useState<number[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<number[]>([]);
  
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [historyConnection, setHistoryConnection] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<ScheduleHistoryItem[]>([]);

  // Rotation Settings: Array of RotationGroups for up to 6 weeks
  const [weeklyRestGroups, setWeeklyRestGroups] = useState<RotationGroup[]>([
    RotationGroup.R1, RotationGroup.R2, RotationGroup.R3, RotationGroup.R4, RotationGroup.R1, RotationGroup.R2
  ]);
  const [showRotationSettings, setShowRotationSettings] = useState(false);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('schedule_history');
    if (saved) {
        try {
            setHistory(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }
  }, []);

  // Save employees to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('staff_data', JSON.stringify(employees));
  }, [employees]);

  // Check for previous month history when Year/Month changes
  useEffect(() => {
    let prevY = year;
    let prevM = month - 1;
    if (prevM < 0) {
        prevM = 11;
        prevY = year - 1;
    }
    const prevHistory = history.find(h => h.year === prevY && h.month === prevM);
    if (prevHistory) {
        setHistoryConnection(`Linked to History: ${new Date(prevY, prevM, 1).toLocaleString('default', { month: 'short', year: 'numeric' })}`);
    } else {
        setHistoryConnection(null);
    }
  }, [year, month, history]);

  const saveToHistory = (result: ScheduleResult) => {
    const newItem: ScheduleHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        year,
        month,
        scheduleResult: result,
        employees: [...employees] // Snapshot
    };
    
    // Check if entry already exists for this month/year and update it, else prepend
    const existingIndex = history.findIndex(h => h.year === year && h.month === month);
    let newHistory = [...history];
    
    if (existingIndex >= 0) {
        newHistory[existingIndex] = newItem;
    } else {
        newHistory = [newItem, ...history].slice(0, 20);
    }
    
    setHistory(newHistory);
    localStorage.setItem('schedule_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      localStorage.setItem('schedule_history', JSON.stringify(newHistory));
  };

  const loadHistoryItem = (item: ScheduleHistoryItem) => {
      if (confirm("Loading this history will replace your current view. Continue?")) {
          setYear(item.year);
          setMonth(item.month);
          setEmployees(item.employees);
          setScheduleResult(item.scheduleResult);
          
          // Restore holidays from the generated schedule structure
          const recoveredSpecialHolidays = item.scheduleResult.schedule
            .filter(d => d.isSpecialHoliday)
            .map(d => d.dayOfMonth);
          
          const recoveredPublicHolidays = item.scheduleResult.schedule
            .filter(d => d.isPublicHoliday)
            .map(d => d.dayOfMonth);

          setSpecialHolidays(recoveredSpecialHolidays);
          setPublicHolidays(recoveredPublicHolidays);
          setAiAnalysis(null);
      }
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setAiAnalysis(null);
    
    // Find previous month data
    let prevY = year;
    let prevM = month - 1;
    if (prevM < 0) {
        prevM = 11;
        prevY = year - 1;
    }
    
    const prevHistory = history.find(h => h.year === prevY && h.month === prevM);
    // Get last 14 days (2 weeks) if available to support 2-week continuous check
    const prevMonthTail = prevHistory 
        ? prevHistory.scheduleResult.schedule.slice(-14) 
        : [];

    // Tiny timeout to let UI show loading state
    setTimeout(() => {
      const scheduler = new Scheduler(
          employees, 
          year, 
          month, 
          specialHolidays, 
          publicHolidays, 
          weeklyRestGroups,
          prevMonthTail // Pass history
      );
      const result = scheduler.generate();
      
      setScheduleResult(result);
      if (result.success) {
          saveToHistory(result); // Auto-save on success
      }
      setIsGenerating(false);
    }, 100);
  };

  const handleAnalyze = async () => {
    if (!scheduleResult) return;
    setIsAnalyzing(true);
    const report = await analyzeSchedule(scheduleResult, employees);
    setAiAnalysis(report);
    setIsAnalyzing(false);
  };

  const handleDayToggle = (day: number) => {
    // Cycle: Normal -> Public Holiday -> Special Holiday -> Normal
    const isSpecial = specialHolidays.includes(day);
    const isPublic = publicHolidays.includes(day);

    if (isSpecial) {
        // Special -> Normal
        setSpecialHolidays(prev => prev.filter(d => d !== day));
    } else if (isPublic) {
        // Public -> Special
        setPublicHolidays(prev => prev.filter(d => d !== day));
        setSpecialHolidays(prev => [...prev, day]);
    } else {
        // Normal -> Public
        setPublicHolidays(prev => [...prev, day]);
    }
  };

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees(prev => [...prev, newEmp]);
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const handleResetStaff = () => {
    if (confirm("This will reset the staff list to the default initial set. All custom changes will be lost. Are you sure?")) {
        setEmployees(INITIAL_STAFF);
    }
  };

  const updateRestGroup = (weekIdx: number, group: RotationGroup) => {
    const newGroups = [...weeklyRestGroups];
    newGroups[weekIdx] = group;
    setWeeklyRestGroups(newGroups);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">AutoSchedule AI <span className="text-blue-600">v7.8</span></h1>
              <p className="text-xs text-gray-500 hidden sm:block">Fairness-Optimized Medical Roster (History Aware)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Staff Button */}
             <button
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md shadow-sm text-sm font-medium transition-colors"
             >
                <Users size={16} />
                <span className="hidden sm:inline">Manage Staff</span>
             </button>

             {/* Date Controls */}
             <div className="flex items-center bg-gray-100 rounded-md p-1">
                <select 
                  value={year} 
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium px-2 py-1 outline-none"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <select 
                  value={month} 
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium px-2 py-1 outline-none"
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i}>{new Date(2000, i, 1).toLocaleString('default', { month: 'short' })}</option>
                  ))}
                </select>
             </div>

             <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
             >
                <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
                Generate
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left: Calendar & Controls */}
          <div className="flex-1 min-w-0">
             
             {/* Rotation Controls */}
             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
               <button 
                 onClick={() => setShowRotationSettings(!showRotationSettings)}
                 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 hover:text-blue-600"
               >
                 <Settings2 size={16} />
                 Rotation (Rest Group) Settings
                 <span className="text-xs font-normal text-gray-400 ml-2">{showRotationSettings ? 'Hide' : 'Show'}</span>
               </button>
               
               {showRotationSettings && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                    {[0, 1, 2, 3, 4, 5].map(weekIdx => (
                      <div key={weekIdx} className="bg-gray-50 p-2 rounded border border-gray-100">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Week {weekIdx + 1} Rest</label>
                        <select 
                          value={weeklyRestGroups[weekIdx]}
                          onChange={(e) => updateRestGroup(weekIdx, e.target.value as RotationGroup)}
                          className="w-full text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.values(RotationGroup).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    ))}
                 </div>
               )}
               <div className="text-[10px] text-gray-400 mt-2 flex flex-wrap items-center gap-3">
                 <span>* <strong>Sat-Anchor Logic:</strong> Rest Group applies to Saturday and its <strong>attached Sunday</strong>.</span>
                 <span>* <strong>2-Week Rule:</strong> Avoids consecutive weekly assignments for Shift B/C.</span>
                 {historyConnection && (
                    <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                        <Link2 size={12} /> {historyConnection}
                    </span>
                 )}
               </div>
             </div>

             <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></span> Shift A</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-200"></span> Shift B</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></span> Shift C</span>
                    <span className="flex items-center gap-1 text-red-600"><Star size={12} fill="currentColor"/> Special</span>
                    <span className="flex items-center gap-1 text-red-400"><Coffee size={12} /> Holiday</span>
                  </div>
                </div>
                
                <CalendarView 
                  scheduleResult={scheduleResult}
                  employees={employees}
                  year={year}
                  month={month}
                  specialHolidays={specialHolidays}
                  publicHolidays={publicHolidays}
                  onToggleDayType={handleDayToggle}
                  weeklyRestGroups={weeklyRestGroups}
                />
             </div>

             {/* Logs */}
             {scheduleResult && !scheduleResult.success && (
               <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
                 <div className="font-bold flex items-center gap-2 mb-2"><ShieldAlert size={16}/> Scheduling Issues Found</div>
                 <ul className="list-disc list-inside opacity-80 max-h-32 overflow-y-auto">
                    {scheduleResult.logs.filter(l => l.includes('Failed')).map((log, i) => <li key={i}>{log}</li>)}
                 </ul>
               </div>
             )}
          </div>

          {/* Right: Stats & AI */}
          <div className="w-full lg:w-96 flex flex-col gap-6">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('stats')}
                    className={`flex-1 py-2 text-sm font-medium ${activeTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Statistics & AI
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    History ({history.length})
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'stats' ? (
                <>
                    {/* Stats */}
                    <div className="h-96">
                       <StatsPanel scheduleResult={scheduleResult} employees={employees} />
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1">
                       <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Wand2 size={16} className="text-purple-600" /> AI Advisor
                          </h3>
                       </div>
                       
                       <div className="bg-gray-50 rounded border border-gray-100 p-3 min-h-[200px] text-sm text-gray-600 mb-4 whitespace-pre-wrap">
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                               <RefreshCw className="animate-spin" size={16} /> Analyzing Fairness...
                            </div>
                          ) : aiAnalysis ? (
                            aiAnalysis
                          ) : (
                            "Generate a schedule first, then ask AI to analyze fairness, burnout risks, and exception usage."
                          )}
                       </div>

                       <button 
                         onClick={handleAnalyze}
                         disabled={!scheduleResult || isAnalyzing}
                         className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Analyze Schedule
                       </button>
                       
                       {/* Quick Info about v7 Logic */}
                       <div className="mt-6 pt-6 border-t border-gray-100">
                          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Algorithm V7.8</h4>
                          <ul className="text-xs text-gray-500 space-y-1">
                            <li>• <span className="text-blue-500 font-bold">New:</span> 2-Week Consecutive Check (Soft).</li>
                            <li>• Avoids Shift B/C if worked previous week.</li>
                            <li>• History aware (Cross-month check up to 14 days).</li>
                          </ul>
                       </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-0 flex-1 overflow-hidden flex flex-col max-h-[800px]">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No saved schedules yet. Generate one to start.</div>
                    ) : (
                        <div className="overflow-y-auto flex-1 p-2 space-y-2">
                            {history.map(item => (
                                <div 
                                    key={item.id} 
                                    onClick={() => loadHistoryItem(item)}
                                    className="p-3 rounded border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">
                                                {new Date(item.year, item.month, 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => deleteHistoryItem(item.id, e)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-white rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500 flex gap-2">
                                        <span className={item.scheduleResult.success ? "text-green-600" : "text-red-600"}>
                                            {item.scheduleResult.success ? "Success" : "Issues Found"}
                                        </span>
                                        <span>•</span>
                                        <span>{item.employees.length} Staff</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

          </div>
        </div>
      </main>
      
      {/* Modals */}
      <StaffManager 
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        employees={employees}
        onAddEmployee={handleAddEmployee}
        onRemoveEmployee={handleRemoveEmployee}
        onResetStaff={handleResetStaff}
      />
    </div>
  );
}