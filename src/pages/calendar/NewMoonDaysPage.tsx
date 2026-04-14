import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  addMonths, 
  endOfMonth, 
  format, 
  isSameDay, 
  startOfMonth, 
  eachDayOfInterval, 
  isWithinInterval,
  parseISO 
} from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/language';
import { calendarStyles, formFieldStyles, pageContainerStyles, cn } from '../../styles/formStyles';
import { theme } from '../../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';

interface MoonPhase {
  date: string;
  phase: keyof typeof MOON_PHASES;
  label: string;
}

interface SavedDate {
  date: string;
  label?: string;
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

// Helper to validate API responses
function isValidMoonPhaseArray(data: unknown): data is MoonPhase[] {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' && 
    item !== null && 
    typeof item.date === 'string' && 
    typeof item.phase === 'string' &&
    Object.keys(MOON_PHASES).includes(item.phase)
  );
}

function isValidSavedDateArray(data: unknown): data is SavedDate[] {
  return Array.isArray(data) && data.every(item => 
    typeof item === 'object' && 
    item !== null && 
    typeof item.date === 'string'
  );
}

async function fetchMoonPhases(startDate: Date, endDate: Date, token: string | null): Promise<MoonPhase[]> {
  try {
    const response = await axios.get('https://tmsapi.xesstechlink.com/api/moon-phases', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      timeout: 5000,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (isValidMoonPhaseArray(response.data)) {
      return response.data;
    }
    console.warn('Invalid moon phases response format:', response.data);
    return [];
  } catch (error) {
    console.error('Failed to fetch moon phases:', error);
    return [];
  }
}

const loadSavedDates = async (token: string | null): Promise<SavedDate[]> => {
  try {
    const now = new Date();
    const start = startOfMonth(addMonths(now, -1));
    const end = endOfMonth(addMonths(now, 1));
    
    const response = await axios.get('/api/moon-dates', {
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (isValidSavedDateArray(response.data)) {
      return response.data;
    }
    console.warn('Invalid saved dates response format:', response.data);
    return [];
  } catch (error) {
    console.error('Failed to load saved dates:', error);
    return [];
  }
};

const saveDatesToStorage = async (dates: SavedDate[], token: string | null) => {
  try {
    await Promise.all(dates.map(date => 
      axios.post('/api/moon-dates', date, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
    ));
  } catch (error) {
    console.error('Failed to save dates:', error);
  }
};

const deleteDateFromStorage = async (date: string, token: string | null) => {
  try {
    await axios.delete(`/api/moon-dates/${encodeURIComponent(date)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    return true;
  } catch (error) {
    console.error('Failed to delete date:', error);
    return false;
  }
};

export default function NewMoonDaysPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  
  
  const translations = {
    english: {
      title: 'அமாவாசை நாட்கள்',
      previous: 'முந்தையது',
      today: 'இன்று',
      next: 'அடுத்தது',
      jumpPlaceholder: 'தேதிக்கு செல்',
      jump: 'செல்',
      addLabelFor: 'இதற்கு லேபிளைச் சேர்',
      enterLabel: 'லேபிளை உள்ளிடவும்',
      cancel: 'ரத்து செய்',
      save: 'சேமி',
      selectTime: 'நேரத்தைத் தேர்ந்தெடு',
      selected: 'தேர்ந்தெடுக்கப்பட்டது:',
      savedDates: 'சேமிக்கப்பட்ட தேதிகள்',
      exportDates: 'தேதிகளை ஏற்றுமதி செய்',
      saveRange: 'வரம்பை சேமி',
      deleteRange: 'வரம்பை நீக்கு',
      noSaved: 'இன்னும் தேதிகள் இல்லை',
      saveDateCta: "தேதியைத் தேர்ந்தெடுத்து 'தேதியை சேமி' ஐ அழுத்தவும்",
      saveDate: 'தேதியை சேமி',
      alreadySaved: 'ஏற்கனவே சேமிக்கப்பட்டது',
      label: 'லேபிள்:',
      upcomingNewMoons: 'வரவிருக்கும் அமாவாசை நாட்கள்',
      note: 'குறிப்பு: தேதிகள் சராசரி சிநோடிக் மாதத்தை அடிப்படையாகக் கொண்டவை.',
      moonPhases: 'நிலா நிலைகள்',
      noPhaseData: 'நிலா நிலை தகவல் இல்லை.',
      tipTitle: '💡 குறிப்புரை',
      tipText: 'ஏதேனும் தேதியை சொடுக்கி குறியிடலாம். வரம்பு தேர்வைப் பயன்படுத்தி ஒரே நேரத்தில் பல தேதிகளை சேமிக்கவும் அல்லது நீக்கவும்.',
      phaseLabels: {
        NEW: 'அமாவாசை',
        FIRST_QUARTER: 'முதல் காலம்',
        FULL: 'முழுநிலா',
        LAST_QUARTER: 'கடைசி காலம்',
      },
    },
    tamil: {
      title: 'New Moon Days',
      previous: 'Previous',
      today: 'Today',
      next: 'Next',
      jumpPlaceholder: 'Jump to date',
      jump: 'Jump',
      addLabelFor: 'Add Label for',
      enterLabel: 'Enter label',
      cancel: 'Cancel',
      save: 'Save',
      selectTime: 'Select Time',
      selected: 'Selected:',
      savedDates: 'Saved Dates',
      exportDates: 'Export Dates',
      saveRange: 'Save Range',
      deleteRange: 'Delete Range',
      noSaved: 'No saved dates yet',
      saveDateCta: "Select a date and click 'Save Date' to add it here",
      saveDate: 'Save Date',
      alreadySaved: 'Already Saved',
      label: 'Label:',
      upcomingNewMoons: 'Upcoming New Moon Days',
      note: 'Note: Dates are approximate, based on the mean synodic month.',
      moonPhases: 'Moon Phases',
      noPhaseData: 'No moon phase data available.',
      tipTitle: '💡 Tip',
      tipText: 'Click any date to mark it. Use the calendar’s range selection to bulk-save or delete multiple dates at once.',
      phaseLabels: {
        NEW: 'New Moon',
        FIRST_QUARTER: 'First Quarter',
        FULL: 'Full Moon',
        LAST_QUARTER: 'Last Quarter',
      },
    },
  } as const;

  // Fixed language logic: English should use 'english', Tamil should use 'tamil'
  const lang = (String(language).toLowerCase() === 'tamil' ? 'tamil' : 'english') as 'english' | 'tamil';
  const t = translations[lang];

  const getPhaseLabel = useCallback((phase: keyof typeof MOON_PHASES) => {
    return t.phaseLabels[phase];
  }, [t]);

  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return startOfMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [moonPhases, setMoonPhases] = useState<MoonPhase[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [savedDates, setSavedDates] = useState<SavedDate[]>([]);
  const [quickJumpDate, setQuickJumpDate] = useState<string>('');
  const [rangeSelection, setRangeSelection] = useState<{from: Date | null; to: Date | null}>({from: null, to: null});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { rangeStart, rangeEnd } = useMemo(() => ({
    rangeStart: startOfMonth(addMonths(month, -1)),
    rangeEnd: endOfMonth(addMonths(month, 1)),
  }), [month]);

  // Fetch moon phases when range changes
  useEffect(() => {
    fetchMoonPhases(rangeStart, rangeEnd, token).then(setMoonPhases);
  }, [rangeStart, rangeEnd, token]);

  // Load saved dates on mount and when token changes
  useEffect(() => {
    const loadData = async () => {
      const dates = await loadSavedDates(token);
      setSavedDates(dates);
    };
    loadData();
  }, [token]);

  const isDateSaved = useCallback((date: Date) => {
    return savedDates.some(d => isSameDay(parseISO(d.date), date));
  }, [savedDates]);

  // 🔥 CRITICAL FIX: Never include null in modifiers
  const modifiers = useMemo(() => {
    const mods: Record<string, Date | Date[] | { from: Date; to: Date }> = {
      today: new Date(),
      saved: savedDates.map(d => parseISO(d.date)),
    };

    // Only add selected if it's a valid Date
    if (selectedDate) {
      mods.selected = selectedDate;
    }

    // Add moon phase modifiers
    Object.entries(MOON_PHASES).forEach(([phase]) => {
      const phaseDates = moonPhases
        .filter(p => p.phase === phase)
        .map(p => parseISO(p.date));
      if (phaseDates.length > 0) {
        mods[phase.toLowerCase()] = phaseDates;
      }
    });

    // Add range selection
    if (rangeSelection.from && rangeSelection.to) {
      mods.range = { from: rangeSelection.from, to: rangeSelection.to };
      mods.rangeStart = rangeSelection.from;
      mods.rangeEnd = rangeSelection.to;
    }

    return mods;
  }, [moonPhases, selectedDate, rangeSelection, savedDates]);

  const modifiersStyles = useMemo(() => ({
    today: { border: '2px solid #3b82f6' },
    selected: { 
      backgroundColor: '#f97316',
      color: 'white',
      '&:hover': {
        backgroundColor: '#ea580c'
      }
    },
    saved: { 
      backgroundColor: '#f0fdf4',
      border: '1px solid #10b981'
    },
    range: { 
      backgroundColor: '#e0f2fe',
      color: '#0369a1'
    },
    rangeStart: {
      borderTopLeftRadius: '50%',
      borderBottomLeftRadius: '50%'
    },
    rangeEnd: {
      borderTopRightRadius: '50%',
      borderBottomRightRadius: '50%'
    },
    ...Object.fromEntries(
      Object.entries(MOON_PHASES).map(([phase, { color }]) => [
        phase.toLowerCase(),
        {
          position: 'relative' as const,
          '&::after': {
            content: `'${MOON_ICONS[phase as keyof typeof MOON_ICONS]} ${getPhaseLabel(phase as keyof typeof MOON_PHASES)}'`,
            position: 'absolute' as const,
            bottom: 0,
            left: 0,
            right: 0,
            textAlign: 'center' as const,
            fontSize: '0.75rem',
            color,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 0',
            borderRadius: '0 0 4px 4px'
          }
        }
      ])
    )
  }), [getPhaseLabel]);

  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
    }
    setSelectedDate(newDate);
    setShowLabelModal(true);
  };

  const handleSaveWithLabel = async () => {
    if (!selectedDate) return;
    
    try {
      const newSavedDate = {
        date: selectedDate.toISOString(),
        label: labelInput
      };
      
      await axios.post('/api/moon-dates', newSavedDate, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      const dates = await loadSavedDates(token);
      setSavedDates(dates);
      
      setLabelInput('');
      setShowLabelModal(false);
    } catch (error) {
      console.error('Failed to save date:', error);
    }
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
    if (selectedDate && !isDateSaved(selectedDate)) {
      const updatedDates = [...savedDates, { date: selectedDate.toISOString(), label: '' }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSavedDates(updatedDates);
      saveDatesToStorage(updatedDates, token);
    }
  };

  const handleDeleteDate = async (date: Date) => {
    if (!date) return;
    
    setIsLoading(true);
    const dateString = date.toISOString();
    const success = await deleteDateFromStorage(dateString, token);
    
    if (success) {
      setSavedDates(savedDates.filter(d => d.date !== dateString));
      setSelectedDate(null);
    }
    
    setIsLoading(false);
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
      savedDates: savedDates.map(date => format(parseISO(date.date), 'yyyy-MM-dd HH:mm')),
      moonPhases: savedDates.map(date => {
        const phase = moonPhases.find(p => isSameDay(parseISO(p.date), parseISO(date.date)));
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
      
      const newDates = datesInRange.filter(date => !isDateSaved(date));
      
      if (newDates.length > 0) {
        const updatedDates = [...savedDates, ...newDates.map(d => ({ date: d.toISOString(), label: '' }))].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setSavedDates(updatedDates);
        saveDatesToStorage(updatedDates, token);
      }
      setRangeSelection({from: null, to: null});
    }
  };

  const handleBulkDelete = () => {
    if (rangeSelection.from && rangeSelection.to) {
      const updatedDates = savedDates.filter(date => 
        !isWithinInterval(parseISO(date.date), {
          start: rangeSelection.from!,
          end: rangeSelection.to!
        })
      );
      setSavedDates(updatedDates);
      saveDatesToStorage(updatedDates, token);
      setRangeSelection({from: null, to: null});
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-lg font-bold text-center">
              {t.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
                <div className="bg-white p-6 rounded-lg shadow-xl animate-pulse">
                  <div className="h-4 w-32 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 w-24 bg-gray-300 rounded"></div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Calendar & Controls (Left Column) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Calendar Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMonth(prev => addMonths(prev, -1))}
                        className={cn(theme.input.base, "p-2 rounded-lg hover:bg-gray-50 transition-colors")}
                        aria-label={t.previous}
                      >
                        ←
                      </button>
                      <span className="text-xl font-semibold text-gray-800">
                        {format(month, 'MMMM yyyy')}
                      </span>
                      <button
                        onClick={() => setMonth(prev => addMonths(prev, 1))}
                        className={cn(theme.input.base, "p-2 rounded-lg hover:bg-gray-50 transition-colors")}
                        aria-label={t.next}
                      >
                        →
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setMonth(startOfMonth(new Date()))}
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        {t.today}
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={quickJumpDate}
                          onChange={(e) => setQuickJumpDate(e.target.value)}
                          className={cn(theme.input.base, "px-3 py-2 rounded-lg text-sm")}
                          placeholder={t.jumpPlaceholder}
                        />
                        <button
                          onClick={handleQuickJump}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                          disabled={!quickJumpDate}
                        >
                          {t.jump}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="mt-4">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      modifiers={modifiers}
                      modifiersStyles={modifiersStyles}
                      month={month}
                      onMonthChange={setMonth}
                      captionLayout="dropdown-buttons"
                      fromMonth={new Date(1900, 0, 1)}
                      toMonth={new Date(2100, 11, 31)}
                      className="w-full"
                    />
                  </div>

                  {/* Selected Date Info */}
                  {selectedDate && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-2">{t.selected}</h3>
                      <p className="text-gray-900">{format(selectedDate, 'EEEE, MMMM do yyyy')}</p>
                      <p className="text-gray-700">{format(selectedDate, 'h:mm a')}</p>
                      
                      {moonPhases.some(p => isSameDay(parseISO(p.date), selectedDate)) && (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                          <span>{MOON_ICONS[moonPhases.find(p => isSameDay(parseISO(p.date), selectedDate))!.phase]}</span>
                          <span>{MOON_PHASES[moonPhases.find(p => isSameDay(parseISO(p.date), selectedDate))!.phase].label}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Time Picker */}
                  <div className="mt-6">
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.selectTime}
                    </label>
                    <input
                      type="time"
                      id="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className={cn(theme.input.base, "block w-full rounded-lg shadow-sm")}
                    />
                  </div>
                </div>

                {/* Save / Export Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {t.savedDates}
                    </h2>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSaveDate}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !selectedDate || isDateSaved(selectedDate)
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        disabled={!selectedDate || isDateSaved(selectedDate)}
                      >
                        {isDateSaved(selectedDate) 
                          ? t.alreadySaved 
                          : t.saveDate}
                      </button>

                      <button
                        onClick={handleExportDates}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        disabled={savedDates.length === 0}
                      >
                        {t.exportDates}
                      </button>

                      {rangeSelection.from && (
                        <>
                          <button
                            onClick={handleBulkSave}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                          >
                            {t.saveRange}
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                          >
                            {t.deleteRange}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Saved Dates List */}
                  {savedDates.length > 0 ? (
                    <div className="border-t border-gray-200 pt-4">
                      <ul className="space-y-3">
                        {savedDates.map((date, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{format(parseISO(date.date), 'EEEE, MMMM do yyyy')}</div>
                              <div className="text-sm text-gray-600">{format(parseISO(date.date), 'h:mm a')}</div>
                              
                              {date.label && (
                                <div className="mt-1 flex items-center gap-1">
                                  <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-800">
                                    {t.label} {date.label}
                                  </span>
                                </div>
                              )}
                              
                              {moonPhases.some(p => isSameDay(parseISO(p.date), parseISO(date.date))) && (
                                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full" 
                                  style={{ 
                                    backgroundColor: `${MOON_PHASES[moonPhases.find(p => isSameDay(parseISO(p.date), parseISO(date.date)))!.phase].color}20`,
                                    color: MOON_PHASES[moonPhases.find(p => isSameDay(parseISO(p.date), parseISO(date.date)))!.phase].color,
                                    border: `1px solid ${MOON_PHASES[moonPhases.find(p => isSameDay(parseISO(p.date), parseISO(date.date)))!.phase].color}`
                                  }}>
                                  {getPhaseLabel(moonPhases.find(p => isSameDay(parseISO(p.date), parseISO(date.date)))!.phase)}
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDate(parseISO(date.date));
                              }}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                              title="Remove date"
                              aria-label="Delete date"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className={cn(theme.input.base, "text-center py-12 border-2 border-dashed rounded-lg")}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="mt-4 text-gray-500">{t.noSaved}</p>
                      <p className="text-sm text-gray-400 mt-1">{t.saveDateCta}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sidebar - Moon Phases & Upcoming */}
              <div className="space-y-6">
                
                {/* Moon Phase Legend */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">{t.moonPhases}</h2>
                  <div className="space-y-2">
                    {Object.entries(MOON_PHASES).map(([phase, { color }]) => (
                      <div key={phase} className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: color }} 
                        ></div>
                        <span className="text-sm text-gray-700">{getPhaseLabel(phase as keyof typeof MOON_PHASES)}</span>
                        <span className="text-xs text-gray-500 ml-auto">{MOON_ICONS[phase as keyof typeof MOON_ICONS]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming New Moons */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {t.upcomingNewMoons}
                  </h2>
                  
                  <ul className="space-y-2">
                    {moonPhases
                      .filter(phase => phase.phase === 'NEW' && parseISO(phase.date) >= startOfMonth(month))
                      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                      .slice(0, 6)
                      .map((phase) => (
                        <li 
                          key={phase.date}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-lg">{MOON_ICONS.NEW}</span>
                          <span className="text-sm text-gray-800">
                            {format(parseISO(phase.date), 'EEE, MMM dd')}
                          </span>
                        </li>
                      ))}
                  </ul>

                  {moonPhases.filter(p => p.phase === 'NEW').length === 0 && (
                    <p className="text-sm text-gray-500 italic mt-4">
                      {t.noPhaseData}
                    </p>
                  )}
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">{t.tipTitle}</h3>
                  <p className="text-sm text-blue-800">
                    {t.tipText}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Label Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t.addLabelFor} {selectedDate && format(selectedDate, 'MMM dd, yyyy')}
            </h3>
            
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder={t.enterLabel}
              className={cn(theme.input.base, "w-full px-4 py-3 rounded-lg mb-6")}
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveWithLabel}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}