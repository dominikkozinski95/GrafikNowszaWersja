
import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string | null) => void;
  initialNote?: string;
  empName: string;
  day: number;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote = '',
  empName,
  day
}) => {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (isOpen) setNote(initialNote || '');
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Notatka: {empName} (Dzień {day})
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] resize-none"
              placeholder="Wpisz treść notatki..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
             <button onClick={() => { onSave(null); onClose(); }} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200">
               Usuń
             </button>
             <div className="flex-1 flex gap-3">
                <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
                Anuluj
                </button>
                <button onClick={() => { onSave(note); onClose(); }} className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex justify-center items-center gap-2">
                <Check className="w-4 h-4" />
                Zapisz
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
