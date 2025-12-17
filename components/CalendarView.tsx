import React from 'react';
import { ScheduleResult, ShiftType, Employee, RotationGroup } from '../types';
import { SHIFT_COLORS, SHIFT_LABELS } from '../constants';
import { AlertCircle, Star, Coffee } from 'lucide-react';

interface CalendarViewProps {
  scheduleResult: ScheduleResult | null;
  employees: Employee[];
  year: number;
  month: number;
  onToggleDayType: (day: number) => void;
  specialHolidays: number[];
  publicHolidays: number[];
  weeklyRestGroups: RotationGroup[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  scheduleResult, 
  employees, 
  year, 
  month,
  onToggleDayType,
  specialHolidays,
  publicHolidays,
  weeklyRestGroups
}) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name.split('(')[0] || id;
  };

  const renderDayCell = (dayNum: number, index: number) => {
    const isSpecial = specialHolidays.includes(dayNum);
    const isPublic = publicHolidays.includes(dayNum);
    
    const date = new Date(year, month, dayNum);
    const dayOfWeek = date.getDay(); // 0 = Sun
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isSaturday = dayOfWeek === 6;
    
    // Determine visual style based on day type
    const bgClass = isSpecial ? 'bg-red-100' : isPublic ? 'bg-red-50' : isWeekend ? 'bg-gray-50' : 'bg-white';
    const textClass = (isSpecial || isPublic || dayOfWeek === 0) ? 'text-red-600' : dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-700';

    // Calculate Week Index for Rest Group based on Saturday
    // Days 1-7 (1st Sat) -> Index 0
    // Days 8-14 (2nd Sat) -> Index 1
    // We display the tag on the Saturday cell.
    const saturdayIndex = Math.floor((dayNum - 1) / 7);

    // Find schedule for this day
    const dayData = scheduleResult?.schedule.find(d => d.dayOfMonth === dayNum);

    return (
      <div 
        key={dayNum} 
        className={`min-h-[140px] border border-gray-100 p-2 flex flex-col gap-1 relative transition-all group ${bgClass} hover:border-blue-200 hover:shadow-sm`}
      >
        {/* Rest Group Indicator (Only on Saturdays) */}
        {isSaturday && (
            <div className="absolute -top-3 right-0 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded-l shadow-sm z-10" title="Rest Group for this weekend and preceding Thursday">
                Rest: {weeklyRestGroups[saturdayIndex] || 'N/A'}
            </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <span className={`text-sm font-bold ${textClass}`}>
            {dayNum}
          </span>
          <button 
            onClick={() => onToggleDayType(dayNum)}
            className={`p-1 rounded hover:bg-black/5 ${isSpecial ? 'text-yellow-600' : isPublic ? 'text-red-500' : 'text-gray-300'} opacity-60 hover:opacity-100 transition-all`}
            title="Toggle: Normal -> Public Holiday -> Special Holiday"
          >
            {isSpecial ? (
                <Star size={14} fill="currentColor" />
            ) : isPublic ? (
                <Coffee size={14} />
            ) : (
                <Star size={14} />
            )}
          </button>
        </div>

        {/* Assignments */}
        <div className="flex flex-col gap-1 text-xs">
          {dayData?.assignments.map((ass, idx) => (
            <div 
              key={idx} 
              className={`px-2 py-1 rounded border flex justify-between items-center ${SHIFT_COLORS[ass.shiftType]}`}
            >
              <span>{getEmployeeName(ass.employeeId)}</span>
              <div className="flex items-center gap-1">
                 <span className="font-mono font-bold opacity-75">{ass.shiftType.split('_')[1]}</span>
                 {ass.isSpecialException && <AlertCircle size={10} className="text-red-600" />}
              </div>
            </div>
          ))}
          {!dayData && <div className="text-gray-300 text-[10px] text-center mt-4">No Data</div>}
        </div>
      </div>
    );
  };

  // Grid padding
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => (
    <div key={`blank-${i}`} className="bg-gray-50/50 border border-transparent"></div>
  ));

  const days = Array.from({ length: daysInMonth }, (_, i) => renderDayCell(i + 1, i));

  return (
    <div className="w-full">
        <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <div key={d} className={`text-center text-xs font-semibold uppercase ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                    {d}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
            {blanks}
            {days}
        </div>
    </div>
  );
};

export default CalendarView;