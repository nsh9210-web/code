import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ScheduleResult, Employee, ShiftType } from '../types';

interface StatsPanelProps {
  scheduleResult: ScheduleResult | null;
  employees: Employee[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ scheduleResult, employees }) => {
  if (!scheduleResult) return <div className="text-gray-400 text-sm">No schedule generated yet.</div>;

  // Aggregate Data
  const data = employees.map(emp => {
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let exceptions = 0;

    scheduleResult.schedule.forEach(day => {
      const assignment = day.assignments.find(a => a.employeeId === emp.id);
      if (assignment) {
        if (assignment.shiftType === ShiftType.A) countA++;
        if (assignment.shiftType === ShiftType.B) countB++;
        if (assignment.shiftType === ShiftType.C) countC++;
        if (assignment.isSpecialException) exceptions++;
      }
    });

    return {
      name: emp.name.split('(')[0].trim(), // Short name
      total: countA + countB + countC,
      A: countA,
      B: countB,
      C: countC,
      ex: exceptions
    };
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Workload Distribution</h3>
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
            <Tooltip />
            <Bar dataKey="A" stackId="a" fill="#3b82f6" name="Shift A" />
            <Bar dataKey="B" stackId="a" fill="#a855f7" name="Shift B" />
            <Bar dataKey="C" stackId="a" fill="#f97316" name="Shift C" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-xs text-gray-500">
        * Stacked bars show total shifts. Colors match schedule.
      </div>
    </div>
  );
};

export default StatsPanel;
