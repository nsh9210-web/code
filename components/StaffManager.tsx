import React, { useState } from 'react';
import { Employee, RoleGroup, RotationGroup } from '../types';
import { X, Plus, Trash2, Users, RotateCcw } from 'lucide-react';

interface StaffManagerProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onResetStaff: () => void;
}

const StaffManager: React.FC<StaffManagerProps> = ({ isOpen, onClose, employees, onAddEmployee, onRemoveEmployee, onResetStaff }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<RoleGroup>(RoleGroup.G1);
  const [newRotation, setNewRotation] = useState<RotationGroup>(RotationGroup.R1);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim()) return;
    
    // Generate a new ID based on max existing ID (assuming numeric IDs)
    const ids = employees.map(e => parseInt(e.id)).filter(n => !isNaN(n));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    const newId = (maxId + 1).toString();

    const newEmp: Employee = {
      id: newId,
      name: newName,
      role: newRole,
      rotationGroup: newRotation
    };
    onAddEmployee(newEmp);
    setNewName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <Users size={20} className="text-blue-600" />
            Manage Staff
          </h2>
          <div className="flex items-center gap-2">
            <button 
                onClick={onResetStaff}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                title="Reset to original default list"
            >
                <RotateCcw size={12} /> Reset Defaults
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-2">
             {employees.length === 0 && (
                <div className="text-center text-gray-400 py-8">No employees found. Add one below.</div>
             )}
             {employees.map(emp => (
               <div key={emp.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                 <div>
                   <div className="font-semibold text-gray-800 text-sm">{emp.name}</div>
                   <div className="flex gap-2 mt-1">
                     <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${
                        emp.role === RoleGroup.G1 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        emp.role === RoleGroup.G2 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                     }`}>
                       {emp.role}
                     </span>
                     <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-gray-100 text-gray-600 border border-gray-200">
                       {emp.rotationGroup}
                     </span>
                   </div>
                 </div>
                 <button 
                   onClick={() => onRemoveEmployee(emp.id)}
                   className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                   title="Remove Employee"
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             ))}
          </div>
        </div>

        {/* Add New Section */}
        <div className="p-4 border-t bg-white rounded-b-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add New Employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Dr. New"
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
            </div>
            <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Role</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as RoleGroup)}
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(RoleGroup).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div className="sm:col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Group</label>
                <select 
                  value={newRotation}
                  onChange={e => setNewRotation(e.target.value as RotationGroup)}
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                   {Object.values(RotationGroup).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div className="sm:col-span-3">
                <button 
                    onClick={handleAdd}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManager;