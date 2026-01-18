
import React, { useState, useEffect } from 'react';
import { Clock, X, Check } from 'lucide-react';
import { decimalToTime, timeToDecimal } from '../utils';
import type { ShiftOverride } from '../types';

interface CustomShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (override: ShiftOverride) => void;
  initialStart?: number;
  initialEnd?: number;
}

export const CustomShiftModal: React.FC<CustomShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialStart = 8,
  initialEnd = 15
}) => {
  const [startTime, setStartTime] = useState(decimalToTime(initialStart));
  const [endTime, setEndTime] = useState(decimalToTime(initialEnd));
  const [duration, setDuration] = useState('0.00');

  useEffect(() => {
    if (isOpen) {
      setStartTime(decimalToTime(initialStart));
      setEndTime(decimalToTime(initialEnd));
    }
  }, [isOpen, initialStart, initialEnd]);

  useEffect(() => {
    const start = timeToDecimal(startTime);
    const end = timeToDecimal(endTime);
    let diff = end - start;
    if (diff < 0) diff += 24; 
    setDuration(diff.toFixed(2));
  }, [startTime, endTime]);

  const handleSave = () => {
    const start = timeToDecimal(startTime);
    const end = timeToDecimal(endTime);
    let hours = end - start;
    if (hours < 0) hours += 24;

    onSave({
      start,
      end,
      hours
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Niestandardowe Godziny
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Koniec</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-lg"
              />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-3 flex justify-between items-center">
             <span className="text-sm text-indigo-800 font-medium">Czas pracy:</span>
             <span className="text-xl font-bold text-indigo-600">{duration}h</span>
          </div>

          <div className="flex gap-3 pt-2">
             <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
               Anuluj
             </button>
             <button onClick={handleSave} className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex justify-center items-center gap-2">
               <Check className="w-4 h-4" />
               Zastosuj
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
