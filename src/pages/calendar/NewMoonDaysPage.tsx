import React, { useMemo, useState, useEffect } from 'react';
import { addMonths, endOfMonth, format, isSameDay, startOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import axios from 'axios';

interface MoonPhase {
  date: string;
  phase: keyof typeof MOON_PHASES;
  label: string;
}

const MOON_PHASES = {
  NEW: { label: 'New Moon', color: '#ef4444' },
  FIRST_QUARTER: { label: 'First Quarter', color: '#3b82f6' },
  FULL: { label: 'Full Moon', color: '#8b5cf6' },
  LAST_QUARTER: { label: 'Last Quarter', color: '#10b981' }
};

const MOON_ICONS = {
  NEW: '🌑',
  FIRST_QUARTER: '🌓',
  FULL: '🌕',
  LAST_QUARTER: '🌗'
};

async function fetchMoonPhases(startDate: Date, endDate: Date): Promise<MoonPhase[]> {
  try {
    const response = await axios.get<MoonPhase[]>('/api/moon-phases', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      timeout: 5000
    });
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch moon phases:', error);
    return [];
  }
}

function generateMockMoonPhases(start: Date, end: Date): MoonPhase[] {
  const phases: MoonPhase[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    const phaseType = Object.keys(MOON_PHASES)[
      Math.floor(Math.random() * Object.keys(MOON_PHASES).length)
    ] as keyof typeof MOON_PHASES;
    
    phases.push({
      date: current.toISOString(),
      phase: phaseType,
      label: MOON_PHASES[phaseType].label
    });
    
    current = new Date(current.setDate(current.getDate() + Math.floor(Math.random() * 3) + 1));
  }
  
  return phases;
}

// Storage utilities
const STORAGE_KEY = 'savedMoonDates';

const loadSavedDates = (): Date[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved).map((d: string) => new Date(d)) : [];
};

const saveDatesToStorage = (dates: Date[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
  }
};

export default function NewMoonDaysPage() {
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return startOfMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [moonPhases, setMoonPhases] = useState<MoonPhase[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [savedDates, setSavedDates] = useState<Date[]>(() => loadSavedDates());
  const [quickJumpDate, setQuickJumpDate] = useState<string>('');
  const [rangeSelection, setRangeSelection] = useState<{from: Date | null; to: Date | null}>({from: null, to: null});

  const { rangeStart, rangeEnd } = useMemo(() => ({
    rangeStart: startOfMonth(addMonths(month, -1)),
    rangeEnd: endOfMonth(addMonths(month, 1)),
  }), [month]);

  useEffect(() => {
    fetchMoonPhases(rangeStart, rangeEnd).then(setMoonPhases);
  }, [rangeStart, rangeEnd]);

  const modifiers = useMemo(() => ({
    today: new Date(),
    selected: selectedDate,
    saved: savedDates,
    ...Object.fromEntries(
      Object.entries(MOON_PHASES).flatMap(([phase]) => {
        const phaseDates = moonPhases
          .filter(p => p.phase === phase)
          .map(p => new Date(p.date));
        return [
          [phase.toLowerCase(), phaseDates],
          ...phaseDates.map((date, i) => [`${phase.toLowerCase()}-${i}`, date])
        ];
      })
    ),
    range: rangeSelection.from && rangeSelection.to 
      ? { from: rangeSelection.from, to: rangeSelection.to }
      : undefined,
    rangeStart: rangeSelection.from,
    rangeEnd: rangeSelection.to
  }), [moonPhases, selectedDate, rangeSelection, savedDates]);

  const modifiersStyles = useMemo(() => ({
    today: {
      fontWeight: 'bold',
      border: '2px solid #3b82f6'
    },
    selected: {
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 2,
        left: 2,
        right: 2,
        bottom: 2,
        border: '2px solid #000',
        borderRadius: '6px'
      }
    },
    saved: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #10b981'
    },
    ...Object.fromEntries(
      Object.entries(MOON_PHASES).flatMap(([phase, { color }]) => [
        [phase.toLowerCase(), {
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}`,
          '&::after': {
            content: `'${MOON_PHASES[phase as keyof typeof MOON_PHASES].label.slice(0, 1)}'`,
            position: 'absolute',
            bottom: 2,
            right: 2,
            fontSize: '10px',
            fontWeight: 'bold',
            color
          }
        }],
        ...moonPhases
          .filter(p => p.phase === phase)
          .map((_, i) => [
            `${phase.toLowerCase()}-${i}`,
            {
              '&::after': {
                content: `'${MOON_PHASES[phase as keyof typeof MOON_PHASES].label.slice(0, 1)}'`,
                position: 'absolute',
                bottom: 2,
                right: 2,
                fontSize: '10px',
                fontWeight: 'bold',
                color
              }
            }
          ])
      ])
    )
  }), [moonPhases]);

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
    }
    setSelectedDate(newDate);
  };

  const handleRangeSelect = (date: Date) => {
    if (!rangeSelection.from || rangeSelection.to) {
      setRangeSelection({from: date, to: null});
    } else if (date < rangeSelection.from) {
      setRangeSelection({from: date, to: rangeSelection.from});
    } else {
      setRangeSelection({...rangeSelection, to: date});
    }
  };

  const handleSaveDate = () => {
    if (selectedDate && !savedDates.some(d => d.getTime() === selectedDate.getTime())) {
      const updatedDates = [...savedDates, selectedDate].sort((a, b) => a.getTime() - b.getTime());
      setSavedDates(updatedDates);
      saveDatesToStorage(updatedDates);
    }
  };

  const handleDeleteDate = (dateToDelete: Date) => {
    const updatedDates = savedDates.filter(d => d.getTime() !== dateToDelete.getTime());
    setSavedDates(updatedDates);
    saveDatesToStorage(updatedDates);
  };

  const handleQuickJump = () => {
    if (quickJumpDate) {
      const date = new Date(quickJumpDate);
      if (!isNaN(date.getTime())) {
        setMonth(startOfMonth(date));
        setQuickJumpDate('');
      }
    }
  };

  const handleExportDates = () => {
    const data = {
      savedDates: savedDates.map(date => format(date, 'yyyy-MM-dd HH:mm')),
      moonPhases: savedDates.map(date => {
        const phase = moonPhases.find(p => isSameDay(new Date(p.date), date));
        return phase ? MOON_PHASES[phase.phase].label : 'No moon phase data';
      })
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `moon-dates-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkSave = () => {
    if (rangeSelection.from && rangeSelection.to) {
      const datesInRange = eachDayOfInterval({
        start: rangeSelection.from,
        end: rangeSelection.to
      });
      
      const newDates = datesInRange.filter(date => 
        !savedDates.some(d => isSameDay(d, date))
      );
      
      if (newDates.length > 0) {
        const updatedDates = [...savedDates, ...newDates].sort((a, b) => a.getTime() - b.getTime());
        setSavedDates(updatedDates);
        saveDatesToStorage(updatedDates);
      }
      setRangeSelection({from: null, to: null});
    }
  };

  const handleBulkDelete = () => {
    if (rangeSelection.from && rangeSelection.to) {
      const updatedDates = savedDates.filter(date => 
        !isWithinInterval(date, {
          start: rangeSelection.from!,
          end: rangeSelection.to!
        })
      );
      setSavedDates(updatedDates);
      saveDatesToStorage(updatedDates);
      setRangeSelection({from: null, to: null});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Moon Days</h1>
        <div className="text-gray-600">{format(month, 'MMMM yyyy')}</div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <button
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => setMonth(prev => addMonths(prev, -1))}
          >
            Previous
          </button>
          <button
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Today
          </button>
          <button
            className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => setMonth(prev => addMonths(prev, 1))}
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="date"
            value={quickJumpDate}
            onChange={(e) => setQuickJumpDate(e.target.value)}
            className="px-3 py-1.5 rounded border border-gray-300"
            placeholder="Jump to date"
          />
          <button
            onClick={handleQuickJump}
            className="px-3 py-1.5 rounded bg-blue-500 text-white hover:bg-blue-600"
            disabled={!quickJumpDate}
          >
            Jump
          </button>
        </div>

        <DayPicker
          month={month}
          onMonthChange={setMonth}
          showOutsideDays
          weekStartsOn={0}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          captionLayout="buttons"
          onDayClick={(date, event) => {
            if (event.ctrlKey || event.metaKey) {
              handleRangeSelect(date);
            } else {
              handleDateSelect(date);
            }
          }}
          className="rdp-root"
          components={{
            DayContent: (props) => {
              const moonPhase = moonPhases.find(p => isSameDay(new Date(p.date), props.date));
              return (
                <div className="relative flex flex-col items-center">
                  {props.date.getDate()}
                  {moonPhase && (
                    <span className="text-lg absolute -bottom-1">
                      {MOON_ICONS[moonPhase.phase]}
                    </span>
                  )}
                </div>
              );
            }
          }}
        />

        <div className="mt-2">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
            Select Time
          </label>
          <input
            type="time"
            id="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        {selectedDate && (
          <div className="mt-2 p-2 bg-blue-50 rounded-md">
            <p className="font-medium">Selected:</p>
            <p>{format(selectedDate, 'EEEE, MMMM do yyyy')}</p>
            <p>{format(selectedDate, 'h:mm a')}</p>
            {moonPhases.some(p => isSameDay(new Date(p.date), selectedDate)) && (
              <p className="mt-1 text-sm font-medium">
                {MOON_PHASES[moonPhases.find(p => isSameDay(new Date(p.date), selectedDate))!.phase].label}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Saved Dates</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDate}
                className={`px-3 py-1.5 rounded text-sm ${!selectedDate || savedDates.some(d => d.getTime() === selectedDate.getTime()) 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                disabled={!selectedDate || savedDates.some(d => isSameDay(d, selectedDate))}
              >
                {savedDates.some(d => selectedDate && isSameDay(d, selectedDate)) ? 'Already Saved' : 'Save Date'}
              </button>
              <button
                onClick={handleExportDates}
                className="px-3 py-1.5 rounded bg-green-500 hover:bg-green-600 text-white"
                disabled={savedDates.length === 0}
              >
                Export Dates
              </button>
              {rangeSelection.from && (
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkSave}
                    className="px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Save Range
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete Range
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {savedDates.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {savedDates.map((date, i) => (
                <div key={i} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{format(date, 'EEEE, MMMM do yyyy')}</div>
                    <div className="text-sm text-gray-600">{format(date, 'h:mm a')}</div>
                    {moonPhases.some(p => isSameDay(new Date(p.date), date)) && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" 
                        style={{ 
                          backgroundColor: `${MOON_PHASES[moonPhases.find(p => isSameDay(new Date(p.date), date))!.phase].color}20`,
                          color: MOON_PHASES[moonPhases.find(p => isSameDay(new Date(p.date), date))!.phase].color,
                          border: `1px solid ${MOON_PHASES[moonPhases.find(p => isSameDay(new Date(p.date), date))!.phase].color}`
                        }}>
                        {MOON_PHASES[moonPhases.find(p => isSameDay(new Date(p.date), date))!.phase].label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDate(date);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove date"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">No saved dates yet</p>
              <p className="text-sm">Select a date and click 'Save Date' to add it here</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-700">
          {Object.entries(MOON_PHASES).map(([phase, { label, color }]) => (
            <div key={phase} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Upcoming New Moon Days</h2>
        <ul className="list-disc ml-5 space-y-1 text-gray-700">
          {moonPhases
            .filter(phase => phase.phase === 'NEW' && new Date(phase.date) >= startOfMonth(month))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 6)
            .map((phase) => (
              <li key={phase.date}>{format(new Date(phase.date), 'EEEE, dd MMM yyyy')}</li>
            ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Note: Dates are approximate, based on the mean synodic month.
        </p>
      </div>
    </div>
  );
}
