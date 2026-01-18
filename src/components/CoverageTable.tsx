
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { isWeekend } from '../utils';

interface CoverageTableProps {
  coverageStats: Record<number, Record<number, number>>;
  daysArray: number[];
  year: number;
  month: number;
  holidays: number[];
}

export const CoverageTable: React.FC<CoverageTableProps> = ({
  coverageStats,
  daysArray,
  year,
  month,
  holidays
}) => {
  const displayHours = Array.from({ length: 13 }, (_, i) => i + 8);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 flex-col overflow-hidden">
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Obłożenie Godzinowe</h3>
      </div>
      <div className="overflow-auto">
        <table className="border-collapse w-full min-w-max">
          <thead className="bg-gray-50">
             <tr>
              <th className="sticky left-0 z-20 bg-gray-50 border-b border-r border-gray-200 p-3 text-left w-64 min-w-[250px]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Godzina</span>
              </th>
              {daysArray.map(day => {
                const isWk = isWeekend(year, month, day);
                const isHol = holidays.includes(day);
                return (
                  <th key={day} className={`border-b border-r border-gray-200 p-2 min-w-[45px] text-center ${isWk || isHol ? 'bg-gray-100' : 'bg-white'}`}>
                    <div className={`text-xs font-bold ${isHol ? 'text-red-600' : 'text-gray-900'}`}>{day}</div>
                  </th>
                );
              })}
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayHours.map(hour => (
              <tr key={hour} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white border-r border-gray-200 p-2 px-4 text-xs font-medium text-gray-600">
                  {hour}:00 - {hour + 1}:00
                </td>
                {daysArray.map(day => {
                  const count = coverageStats[day][hour];
                  const isWk = isWeekend(year, month, day);
                  
                  let cellBg = 'bg-white';
                  let textColor = 'text-gray-300';
                  let fontWeight = 'font-normal';

                  if (count === 0) {
                     cellBg = 'bg-red-50';
                     textColor = 'text-red-300';
                  } else if (count > 0 && count <= 2) {
                     cellBg = 'bg-yellow-50';
                     textColor = 'text-yellow-700';
                     fontWeight = 'font-bold';
                  } else {
                     cellBg = 'bg-green-50';
                     textColor = 'text-green-700';
                     fontWeight = 'font-bold';
                  }
                  
                  if (isWk && count === 0) {
                     cellBg = 'bg-gray-100';
                     textColor = 'text-gray-300';
                  }

                  return (
                    <td key={`${day}-${hour}`} className={`border-r border-gray-200 p-1 text-center text-xs ${cellBg} ${textColor} ${fontWeight}`}>
                      {count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
