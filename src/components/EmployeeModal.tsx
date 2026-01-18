
import React from 'react';
import { UserPlus, X, Bot, Hand, Trash2 } from 'lucide-react';
import type { ContractType, LocationType, WorkSystemType, GenerationType } from '../types';
import { LOCATIONS } from '../constants';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void; // New prop
  isEditing: boolean;
  teams: string[];
  formData: {
    name: string;
    team: string;
    contract: ContractType;
    location: LocationType;
    workSystem: WorkSystemType;
    generationType?: GenerationType;
  };
  setFormData: (data: any) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  isEditing,
  teams,
  formData,
  setFormData
}) => {
  if (!isOpen) return null;

  const isUZ = formData.contract === 'UZ';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            {isEditing ? 'Edytuj Pracownika' : 'Dodaj Pracownika'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imię i Nazwisko</label>
            <input 
              type="text" 
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="np. Jan Kowalski"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zespół</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              value={formData.team}
              onChange={e => setFormData({...formData, team: e.target.value})}
            >
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Umowa</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={formData.contract}
                onChange={e => {
                    const newContract = e.target.value as ContractType;
                    setFormData({
                        ...formData, 
                        contract: newContract,
                        generationType: newContract === 'UZ' ? 'manual' : undefined
                    })
                }}
              >
                <option value="UoP">Umowa o Pracę</option>
                <option value="UZ">Umowa Zlecenie</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokalizacja</label>
               <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value as LocationType})}
              >
                {LOCATIONS.map((l: string) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {isUZ && (
             <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-2">
                    Tryb Generowania (Tylko UZ)
                </label>
                <div className="space-y-2">
                    <label className="flex items-start gap-3 p-2 bg-white rounded border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors">
                        <input 
                            type="radio" 
                            name="genType" 
                            className="mt-1 text-indigo-600 focus:ring-indigo-500"
                            checked={formData.generationType === 'auto'}
                            onChange={() => setFormData({...formData, generationType: 'auto'})}
                        />
                        <div>
                            <div className="flex items-center gap-1 font-medium text-sm text-gray-800">
                                <Bot className="w-3 h-3" />
                                Standardowy (Auto)
                            </div>
                            <p className="text-xs text-gray-500">
                                Traktuj jak UoP. Generator automatycznie zaplanuje zmiany w rotacji.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 p-2 bg-white rounded border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors">
                        <input 
                            type="radio" 
                            name="genType" 
                            className="mt-1 text-indigo-600 focus:ring-indigo-500"
                            checked={formData.generationType !== 'auto'} 
                            onChange={() => setFormData({...formData, generationType: 'manual'})}
                        />
                         <div>
                            <div className="flex items-center gap-1 font-medium text-sm text-gray-800">
                                <Hand className="w-3 h-3" />
                                Dyspozycyjność (Ręczny)
                            </div>
                            <p className="text-xs text-gray-500">
                                Generator POMIJA tę osobę. Wpisz zmiany ręcznie na podstawie dyspozycyjności.
                            </p>
                        </div>
                    </label>
                </div>
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">System Pracy</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="workSystem" 
                  value="7h" 
                  checked={formData.workSystem === '7h'}
                  onChange={() => setFormData({...formData, workSystem: '7h'})}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">7 godzin (Standard)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="workSystem" 
                  value="8h" 
                  checked={formData.workSystem === '8h'}
                  onChange={() => setFormData({...formData, workSystem: '8h'})}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">8 godzin (Poprawa)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Zmiana systemu wpływa na długość wszystkich zmian roboczych.</p>
          </div>

          <div className="pt-4 flex gap-3">
             {isEditing && onDelete && (
                <button
                    type="button"
                    onClick={() => { if(confirm('Czy na pewno usunąć tego pracownika?')) onDelete(); }}
                    className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    title="Usuń pracownika"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
             )}
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Anuluj
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
            >
              {isEditing ? 'Zapisz' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
