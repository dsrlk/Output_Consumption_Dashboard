import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle, Clock3 } from 'lucide-react';
import { calculateTimings } from '../utils/etaCalculator';

// Mock Data representing hydrated data from ERP & Excel
const mockOrders = [
  { PON: 'PON/00028476', RS: 180, C1: 'LIN140', C2: 'FLT112', C3: 'LIN140', FLUTE: 'C', LMTR: 5000, priority: 'NORMAL' },
  { PON: 'PON/00028488', RS: 180, C1: 'LIN140', C2: 'FLT112', C3: 'LIN140', FLUTE: 'BC', LMTR: 8000, priority: 'FAST_TRACK' },
  { PON: 'PON/00028497', RS: 160, C1: 'KLB186', C2: 'FLT140', C3: 'KLB186', FLUTE: 'B', LMTR: 2000, priority: 'NORMAL' },
  { PON: 'PON/00028419', RS: 160, C1: 'LIN140', C2: 'FLT112', C3: 'LIN140', FLUTE: 'BC', LMTR: 4500, priority: 'NORMAL' },
  { PON: 'PON/00028420', RS: 140, C1: 'LIN140', C2: 'FLT112', C3: 'LIN140', FLUTE: 'B', LMTR: 6000, priority: 'NORMAL' }
];

export default function CorrugatorSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulate Auto-Sequencing & ETA Calculation on load
  useEffect(() => {
    // In a real app, this sequence comes pre-sorted from the backend/Firebase Cloud Function.
    // For now, we mock the chronological timings.
    const startOfShift = new Date();
    startOfShift.setHours(7, 0, 0, 0); // 7:00 AM today
    
    // Calculate ETAs
    const timedSequence = calculateTimings(mockOrders, startOfShift, 165, 30);
    setSchedule(timedSequence);

    // Live clock ticker to update "Assumed Complete" logic
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (dateObj) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (job) => {
    if (job.status === 'CONFIRMED_COMPLETE') return <CheckCircle className="text-green-500" size={20} />;
    
    // Dynamic ETA logic: if current time > estimated end time, it's assumed complete visually
    if (currentTime > job.estimatedEndTime) {
      return <Clock3 className="text-gray-400" size={20} />;
    }
    
    if (currentTime >= job.plannedStartTime && currentTime <= job.estimatedEndTime) {
      return <Play className="text-blue-500 animate-pulse" size={20} />;
    }
    
    return <Clock className="text-orange-400" size={20} />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Corrugator Live Schedule</h1>
          <p className="text-gray-500 mt-1">Real-time dynamic sequence tracking</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Live Time</p>
          <p className="text-2xl font-semibold text-gray-900">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reel Size</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Flute</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">L. Meters</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Time</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ETA</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedule.map((job, idx) => {
              const isAssumedComplete = currentTime > job.estimatedEndTime && job.status !== 'CONFIRMED_COMPLETE';
              const isRunning = currentTime >= job.plannedStartTime && currentTime <= job.estimatedEndTime;
              
              let rowClass = "hover:bg-gray-50 transition-colors";
              if (isAssumedComplete) rowClass = "bg-gray-50 opacity-60";
              if (isRunning) rowClass = "bg-blue-50/50 border-l-4 border-blue-500";
              if (job.priority === 'FAST_TRACK') rowClass += " bg-amber-50/30";

              return (
                <tr key={idx} className={rowClass}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(job)}
                      <span className="text-sm font-medium text-gray-700">
                        {isAssumedComplete ? 'Assumed' : isRunning ? 'Running' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{job.PON}</span>
                      {job.priority === 'FAST_TRACK' && (
                        <span className="px-2 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-md">URGENT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{job.RS} cm</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.FLUTE}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.LMTR} m</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{formatTime(job.plannedStartTime)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{formatTime(job.estimatedEndTime)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
