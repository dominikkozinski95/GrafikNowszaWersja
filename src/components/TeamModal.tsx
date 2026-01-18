
import React from 'react';
import { Settings, X, Check, Pencil, Trash2, Plus } from 'lucide-react';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: string[];
  editingTeamName: { original: string, current: string } | null;
  setEditingTeamName: (val: { original: string, current: string } | null) => void;
  newTeamName: string;
  setNewTeamName: (val: string) => void;
  onRename: () => void;
  onAdd: (e: React.FormEvent) => void;
  onDelete: (team: string) => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  teams,
  editingTeamName,
  setEditingTeamName,
  newTeamName,
  setNewTeamName,
  onRename,
  onAdd,
  onDelete
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Zarządzaj Zespołami
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
           <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-1">
             {teams.map(team => (
               <div key={team} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-indigo-200 transition-colors">
                 {editingTeamName?.original === team ? (
                   <div className="flex items-center gap-2 w-full">
                     <input 
                       type="text"
                       value={editingTeamName.current}
                       onChange={(e) => setEditingTeamName({...editingTeamName, current: e.target.value})}
                       className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                       autoFocus
                     />
                     <button onClick={onRename} className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                       <Check className="w-4 h-4" />
                     </button>
                     <button onClick={() => setEditingTeamName(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded">
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                 ) : (
                   <>
                     <span className="font-medium text-gray-700">{team}</span>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => setEditingTeamName({original: team, current: team})}
                         className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                         title="Edytuj nazwę"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => onDelete(team)}
                         className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                         title="Usuń zespół"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </>
                 )}
               </div>
             ))}
           </div>

           <div className="pt-4 border-t border-gray-100">
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dodaj nowy zespół</h3>
             <form onSubmit={onAdd} className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Nazwa zespołu..." 
                 className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={newTeamName}
                 onChange={(e) => setNewTeamName(e.target.value)}
               />
               <button 
                 type="submit"
                 disabled={!newTeamName.trim()}
                 className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 <Plus className="w-5 h-5" />
               </button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
};
