import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ta } from 'date-fns/locale';
import { DayPicker, DayContent, DayContentProps, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/language';
import {
  calendarStyles,
  formFieldStyles,
  pageContainerStyles,
  cn,
} from '../../styles/formStyles';
import { theme } from '../../styles/theme';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/ui/card';

/* ─────────────────────────── types ─────────────────────────── */

interface MoonPhase {
  date: string;
  phase: keyof typeof MOON_PHASES;
  label: string;
}

interface SavedDate {
  date: string;
  label?: string;
}

/* ─────────────────────────── constants ─────────────────────── */

const MOON_PHASES = {
  NEW: { label: 'New Moon', color: '#ef4444' },
  FIRST_QUARTER: { label: 'First Quarter', color: '#3b82f6' },
  FULL: { label: 'Full Moon', color: '#8b5cf6' },
  LAST_QUARTER: { label: 'Last Quarter', color: '#10b981' },
} as const;

const MOON_ICONS: Record<keyof typeof MOON_PHASES, string> = {
  NEW: '🌑',
  FIRST_QUARTER: '🌓',
  FULL: '🌕',
  LAST_QUARTER: '🌗',
};

/* ─────────────────────────── validators ────────────────────── */

function isValidMoonPhaseArray(data: unknown): data is MoonPhase[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as any).date === 'string' &&
        typeof (item as any).phase === 'string' &&
        Object.keys(MOON_PHASES).includes((item as any).phase)
    )
  );
}

function isValidSavedDateArray(data: unknown): data is SavedDate[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as any).date === 'string'
    )
  );
}

/* ─────────────────────────── api helpers ───────────────────── */

async function fetchMoonPhases(
  startDate: Date,
  endDate: Date,
  token: string | null
): Promise<MoonPhase[]> {
  try {
    const response = await axios.get(
      'https://templeapi.agniplay.com/api/moon-phases',
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        timeout: 5000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (isValidMoonPhaseArray(response.data)) return response.data;
    console.warn('Invalid moon phases response format:', response.data);
    return [];
  } catch (error) {
    console.error('Failed to fetch moon phases:', error);
    return [];
  }
}

const loadSavedDates = async (
  token: string | null
): Promise<SavedDate[]> => {
  try {
    const now = new Date();
    const start = startOfMonth(addMonths(now, -1));
    const end = endOfMonth(addMonths(now, 1));
    const response = await axios.get('/api/moon-dates', {
      params: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (isValidSavedDateArray(response.data)) return response.data;
    console.warn('Invalid saved dates response format:', response.data);
    return [];
  } catch (error) {
    console.error('Failed to load saved dates:', error);
    return [];
  }
};

const saveDatesToStorage = async (
  dates: SavedDate[],
  token: string | null
) => {
  try {
    await Promise.all(
      dates.map((date) =>
        axios.post('/api/moon-dates', date, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      )
    );
  } catch (error) {
    console.error('Failed to save dates:', error);
  }
};

const deleteDateFromStorage = async (
  date: string,
  token: string | null
): Promise<boolean> => {
  try {
    await axios.delete(`/api/moon-dates/${encodeURIComponent(date)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return true;
  } catch (error) {
    console.error('Failed to delete date:', error);
    return false;
  }
};

/* ─────────────────────────── translations ──────────────────── */

const translations = {
  english: {
    title: 'New Moon Days',
    previous: 'Previous',
    today: 'Today',
    next: 'Next',
    jumpPlaceholder: 'Jump to date',
    jump: 'Go',
    addLabelFor: 'Add label for',
    enterLabel: 'Enter label (optional)',
    cancel: 'Cancel',
    save: 'Save',
    selectTime: 'Select Time',
    selected: 'Selected Date',
    savedDates: 'Saved Dates',
    exportDates: 'Export Dates',
    saveRange: 'Save Range',
    deleteRange: 'Delete Range',
    noSaved: 'No saved dates yet',
    saveDateCta: 'Click a date on the calendar to save it',
    saveDate: 'Save Date',
    alreadySaved: 'Already Saved',
    label: 'Label:',
    upcomingNewMoons: 'Upcoming New Moons',
    note: 'Note',
    moonPhases: 'Moon Phases',
    noPhaseData: 'No moon phase data available',
    tipTitle: 'Tip',
    tipText:
      'Click on a date to save it to your calendar. Select a range by clicking start and end dates.',
    phaseLabels: {
      NEW: 'New Moon',
      FIRST_QUARTER: 'First Quarter',
      FULL: 'Full Moon',
      LAST_QUARTER: 'Last Quarter',
    },
  },
  tamil: {
    title: 'புது நிலவு நாட்கள்',
    previous: 'முன்பு',
    today: 'இன்று',
    next: 'அடுத்து',
    jumpPlaceholder: 'தேதிக்கு மாய்',
    jump: 'செல்',
    addLabelFor: 'சேர்',
    enterLabel: 'உள்ளீடு (விரும்பினால்)',
    cancel: 'ரத்து',
    save: 'சேமி',
    selectTime: 'நேரத்தைத் தேர்ந்தெடுக்க',
    selected: 'தேர்ந்தெடுத்த தேதி',
    savedDates: 'சேமித்த தேதிகள்',
    exportDates: 'ஏற்றுமதி',
    saveRange: 'வரம்பை சேமி',
    deleteRange: 'வரம்பை நீக்கு',
    noSaved: 'தேதிகள் எதுவும் இல்லை',
    saveDateCta: 'சேமிக்க calendarல் click செய்',
    saveDate: 'தேதி சேமி',
    alreadySaved: 'சேமித்துவிட்டதா',
    label: 'label:',
    upcomingNewMoons: 'வரும் புது நிலவு',
    note: 'குறிப்பு',
    moonPhases: 'நிலவு phases',
    noPhaseData: 'data இல்லை',
    tipTitle: 'Tip',
    tipText:
      'Click on a date to save it to your calendar. Select a range by clicking start and end dates.',
    phaseLabels: {
      NEW: 'புது நிலவு',
      FIRST_QUARTER: 'முதல் பகுதி',
      FULL: 'முழு நிலவு',
      LAST_QUARTER: 'கடைப் பகுதி',
    },
  },
} as const;

/* ─────────────────────────── component ─────────────────────── */

export default function NewMoonDaysPage() {
  const { token } = useAuth();
  const { language } = useLanguage();

  const lang = (
    String(language).toLowerCase() === 'english' ? 'tamil' : 'english'
  ) as 'english' | 'tamil';
  const t = translations[lang];

  const getPhaseLabel = useCallback(
    (phase: keyof typeof MOON_PHASES) => t.phaseLabels[phase],
    [t]
  );

  /* ── state ── */
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [moonPhases, setMoonPhases] = useState<MoonPhase[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [savedDates, setSavedDates] = useState<SavedDate[]>([]);
  const [quickJumpDate, setQuickJumpDate] = useState<string>('');
  const [rangeSelection, setRangeSelection] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  /* ── derived range for fetching ── */
  const { rangeStart, rangeEnd } = useMemo(
    () => ({
      rangeStart: startOfMonth(addMonths(month, -1)),
      rangeEnd: endOfMonth(addMonths(month, 1)),
    }),
    [month]
  );

  /* ── effects ── */
  useEffect(() => {
    fetchMoonPhases(rangeStart, rangeEnd, token).then(setMoonPhases);
  }, [rangeStart, rangeEnd, token]);

  useEffect(() => {
    loadSavedDates(token).then(setSavedDates);
  }, [token]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 2500);
    return () => clearTimeout(id);
  }, [toastMsg]);

  /* ── helpers ── */
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const isDateSaved = useCallback(
    (date: Date) =>
      savedDates.some((d) => isSameDay(parseISO(d.date), date)),
    [savedDates]
  );

  const phaseForDate = useCallback(
    (date: Date) =>
      moonPhases.find((p) => isSameDay(parseISO(p.date), date)) ?? null,
    [moonPhases]
  );

  /* ── calendar modifiers ── */
  const modifiers = useMemo(() => {
    const mods: Record<string, Date | Date[] | { from: Date; to: Date }> = {
      today: new Date(),
      saved: savedDates.map((d) => parseISO(d.date)),
    };
    if (selectedDate) mods.selected = selectedDate;
    Object.entries(MOON_PHASES).forEach(([phase]) => {
      const phaseDates = moonPhases
        .filter((p) => p.phase === phase)
        .map((p) => parseISO(p.date));
      if (phaseDates.length > 0) mods[phase.toLowerCase()] = phaseDates;
    });
    if (rangeSelection.from && rangeSelection.to) {
      mods.range = { from: rangeSelection.from, to: rangeSelection.to };
      mods.rangeStart = rangeSelection.from;
      mods.rangeEnd = rangeSelection.to;
    }
    return mods;
  }, [moonPhases, selectedDate, rangeSelection, savedDates]);

  const modifiersStyles = useMemo(
    () => ({
      today: { border: '2px solid #3b82f6', borderRadius: '10px' },
      selected: { backgroundColor: '#f97316', color: 'white', borderRadius: '10px' },
      saved: { backgroundColor: '#f0fdf4', border: '1px solid #10b981', borderRadius: '10px' },
      range: { backgroundColor: '#e0f2fe', color: '#0369a1' },
      rangeStart: {
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
      },
      rangeEnd: {
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
      },
      ...Object.fromEntries(
        Object.entries(MOON_PHASES).map(([phase]) => [
          phase.toLowerCase(),
          { position: 'relative' as const },
        ])
      ),
    }),
    []
  );

  const CustomDayContent = useCallback((props: DayContentProps) => {
    const { date } = props;
    const phase = phaseForDate(date);

    return (
      <div className="relative flex flex-col items-center justify-start w-full h-full p-1 transition-all" style={{ minHeight: 72 }}>
        {/* Our own date number — replaces rdp's hidden one */}
        <span className="absolute top-1 right-1.5 text-[11px] font-bold text-gray-500 z-10 leading-none">
          {format(date, 'd')}
        </span>
        {phase && (
          <div className="flex flex-col items-center justify-center w-full mt-auto mb-1">
            <span className="text-base leading-none mb-0.5" title={getPhaseLabel(phase.phase)}>
              {MOON_ICONS[phase.phase]}
            </span>
            <span
              className="text-[7px] sm:text-[8px] font-bold uppercase text-center leading-[1.1] px-0.5 rounded-[2px] w-[95%] break-words"
              style={{
                color: MOON_PHASES[phase.phase].color,
                backgroundColor: `${MOON_PHASES[phase.phase].color}12`,
              }}
            >
              {getPhaseLabel(phase.phase)}
            </span>
          </div>
        )}
      </div>
    );
  }, [getPhaseLabel, phaseForDate]);

  /* ── handlers ── */
  const handleDateSelect = (date: Date) => {
    const newDate = new Date(date);
    if (selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDate.setHours(hours, minutes);
    }
    setSelectedDate(newDate);
    setShowLabelModal(true);
  };

  const handleSaveWithLabel = async () => {
    if (!selectedDate) return;
    try {
      const newSavedDate: SavedDate = {
        date: selectedDate.toISOString(),
        label: labelInput,
      };
      await axios.post('/api/moon-dates', newSavedDate, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const dates = await loadSavedDates(token);
      setSavedDates(dates);
      setLabelInput('');
      setShowLabelModal(false);
      showToast('Date saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save date:', error);
      showToast('Failed to save date.', 'error');
    }
  };

  const handleDeleteDate = async (date: Date) => {
    setIsLoading(true);
    const dateString = date.toISOString();
    const success = await deleteDateFromStorage(dateString, token);
    if (success) {
      setSavedDates((prev) => prev.filter((d) => d.date !== dateString));
      setSelectedDate(null);
      showToast('Date removed.', 'info');
    }
    setIsLoading(false);
  };

  const handleQuickJump = () => {
    if (!quickJumpDate) return;
    const date = new Date(quickJumpDate);
    if (!isNaN(date.getTime())) {
      setMonth(startOfMonth(date));
      setQuickJumpDate('');
    }
  };

  const handleExportDates = () => {
    const data = {
      savedDates: savedDates.map((date) =>
        format(parseISO(date.date), 'yyyy-MM-dd HH:mm')
      ),
      moonPhases: savedDates.map((date) => {
        const phase = moonPhases.find((p) =>
          isSameDay(parseISO(p.date), parseISO(date.date))
        );
        return phase ? MOON_PHASES[phase.phase].label : 'No moon phase data';
      }),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
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
    if (!rangeSelection.from || !rangeSelection.to) return;
    const datesInRange = eachDayOfInterval({
      start: rangeSelection.from,
      end: rangeSelection.to,
    });
    const newDates = datesInRange.filter((date) => !isDateSaved(date));
    if (newDates.length > 0) {
      const updatedDates = [
        ...savedDates,
        ...newDates.map((d) => ({ date: d.toISOString(), label: '' })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setSavedDates(updatedDates);
      saveDatesToStorage(updatedDates, token);
      showToast(`Saved ${newDates.length} date(s).`, 'success');
    }
    setRangeSelection({ from: null, to: null });
  };

  const handleBulkDelete = () => {
    if (!rangeSelection.from || !rangeSelection.to) return;
    const updatedDates = savedDates.filter(
      (date) =>
        !isWithinInterval(parseISO(date.date), {
          start: rangeSelection.from!,
          end: rangeSelection.to!,
        })
    );
    setSavedDates(updatedDates);
    saveDatesToStorage(updatedDates, token);
    setRangeSelection({ from: null, to: null });
    showToast('Range removed.', 'info');
  };

  /* ─────────── toast color ─────────── */
  const toastBg =
    toastType === 'success'
      ? 'bg-emerald-600'
      : toastType === 'error'
      ? 'bg-red-600'
      : 'bg-gray-800';

  /* ─────────────────────────────────── render ─────────────────── */
  return (
    <div className={cn(pageContainerStyles.container, 'max-w-7xl mx-auto')}>
      {/* ══ Suppress rdp's own date number & force full-width cells ══ */}
      <style>{`
        .rdp-day_button > span:not([class]) { display: none !important; }
        .rdp-day_button > abbr { display: none !important; }
        .rdp-day_button { width: 100% !important; height: 100% !important; padding: 0 !important; display: block !important; }
        .rdp-table { width: 100% !important; table-layout: fixed !important; }
        .rdp-cell { width: 14.285% !important; }
        input[type="time"]::-webkit-calendar-picker-indicator { display: none !important; }
        input[type="time"]::-webkit-inner-spin-button { display: none !important; }
        input[type="time"]::-webkit-clear-button { display: none !important; }
      `}</style>

      {/* ══ Toast ══ */}
      {toastMsg && (
        <div
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 text-white text-sm rounded-2xl shadow-2xl transition-all duration-300',
            toastBg
          )}
          style={{ minWidth: 220 }}
        >
          <span className="text-base">
            {toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️'}
          </span>
          {toastMsg}
        </div>
      )}

      {/* ══ Global loading overlay ══ */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-gray-700 font-medium text-sm">Processing…</span>
          </div>
        </div>
      )}

      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>

          {/* ══ Header ══ */}
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                <span className="mr-2">🌑</span>
                {t.title}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-6">

              {/* ════ TOP: Two-column layout on large screens ════ */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-8">

                {/* ── LEFT: Calendar Column ── */}
                <div className="space-y-5">

                  {/* Calendar card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Header gradient strip */}
                    <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-100">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

                        {/* Month nav */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setMonth((prev) => addMonths(prev, -1))}
                            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all text-gray-600 active:scale-95"
                            aria-label={t.previous}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>

                          <div className="flex flex-col items-center min-w-[200px]">
                            <span className="text-xl font-bold text-gray-800 capitalize leading-tight">
                              {format(month, 'MMMM', { locale: lang === 'tamil' ? ta : undefined })}
                            </span>
                            <span className="text-sm font-medium text-gray-400 leading-tight">
                              {format(month, 'yyyy')}
                            </span>
                          </div>

                          <button
                            onClick={() => setMonth((prev) => addMonths(prev, 1))}
                            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all text-gray-600 active:scale-95"
                            aria-label={t.next}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                      </div>
                    </div>

                    {/* DayPicker */}
                    <div className="p-4
                      [&_.rdp]:w-full
                      [&_.rdp-months]:w-full
                      [&_.rdp-month]:w-full
                      [&_.rdp-table]:w-full
                      [&_.rdp-table]:table-fixed
                      [&_.rdp-tbody]:w-full
                      [&_.rdp-row]:w-full
                      [&_.rdp-cell]:p-[2px]
                      [&_.rdp-cell]:w-[14.285%]
                      [&_.rdp-day]:w-full
                      [&_.rdp-day]:p-0
                      [&_.rdp-day]:h-[72px]
                      [&_.rdp-day]:rounded-xl
                      [&_.rdp-day]:transition-all
                      [&_.rdp-day]:border
                      [&_.rdp-day]:border-gray-100
                      [&_.rdp-day]:hover:border-gray-200
                      [&_.rdp-day]:hover:bg-gray-50
                      [&_.rdp-day_selected]:bg-orange-500
                      [&_.rdp-day_selected]:text-white
                      [&_.rdp-day_selected_span]:text-white
                      [&_.rdp-day_button]:w-full
                      [&_.rdp-day_button]:h-full
                      [&_.rdp-day_button]:p-0
                      [&_.rdp-day_button_span]:hidden
                      [&_.rdp-caption]:hidden
                      [&_.rdp-nav]:hidden
                      [&_.rdp-head_cell]:text-xs
                      [&_.rdp-head_cell]:font-bold
                      [&_.rdp-head_cell]:text-gray-400
                      [&_.rdp-head_cell]:uppercase
                      [&_.rdp-head_cell]:tracking-wider
                      [&_.rdp-head_cell]:pb-2
                      [&_.rdp-head_cell]:w-[14.285%]"
                    >
                      <DayPicker
                        mode="range"
                        selected={rangeSelection}
                        onSelect={setRangeSelection}
                        modifiers={modifiers}
                        modifiersStyles={modifiersStyles}
                        month={month}
                        onMonthChange={setMonth}
                        components={{ DayContent: CustomDayContent }}
                        disableNavigation
                        className="w-full"
                      />
                    </div>

                    </div>
                  </div>

                {/* ── RIGHT: Actions & Info 2x2 Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                  {/* Time picker & Selected Actions */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span>⚙️</span>
                        Actions
                      </h2>

                      {/* Time picker */}
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="time" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {t.selectTime}
                        </label>
                        <input
                          type="time"
                          id="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Selected date info */}
                    {selectedDate && (
                      <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                          {t.selected}
                        </p>
                        <p className="text-gray-900 font-bold text-xs">
                          {format(selectedDate, 'MMM dd, yyyy')}
                        </p>
                        <button
                          onClick={() => selectedDate && setShowLabelModal(true)}
                          disabled={isDateSaved(selectedDate)}
                          className={cn(
                            'w-full px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95',
                            isDateSaved(selectedDate)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                          )}
                        >
                          {isDateSaved(selectedDate) ? t.alreadySaved : t.saveDate}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Moon Phase Legend */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span>🌙</span>
                      {t.moonPhases}
                    </h2>
                    <div className="space-y-2">
                      {(Object.entries(MOON_PHASES) as [keyof typeof MOON_PHASES, (typeof MOON_PHASES)[keyof typeof MOON_PHASES]][]).map(
                        ([phase, { color }]) => (
                          <div
                            key={phase}
                            className="flex items-center gap-2"
                          >
                            <span className="text-base">{MOON_ICONS[phase]}</span>
                            <span className="text-[11px] text-gray-600 flex-1 font-medium">{getPhaseLabel(phase)}</span>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Upcoming New Moons */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>🌑</span>
                      {t.upcomingNewMoons}
                    </h2>

                    <div className="max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                      {moonPhases.filter(
                        (p) => p.phase === 'NEW' && parseISO(p.date) >= startOfMonth(month)
                      ).length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">{t.noPhaseData}</p>
                      ) : (
                        <ul className="space-y-1">
                          {moonPhases
                            .filter((phase) => phase.phase === 'NEW' && parseISO(phase.date) >= startOfMonth(month))
                            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                            .slice(0, 5)
                            .map((phase) => (
                              <li
                                key={phase.date}
                                className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setMonth(startOfMonth(parseISO(phase.date)))}
                              >
                                <span className="text-xs">{MOON_ICONS.NEW}</span>
                                <span className="text-[11px] font-semibold text-gray-700">
                                  {format(parseISO(phase.date), 'MMM dd')}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Calendar Key */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Key</p>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { swatch: <span className="w-3 h-3 rounded-full border border-blue-500 inline-block" />, label: 'Today' },
                        { swatch: <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#f97316' }} />, label: 'Selected' },
                        { swatch: <span className="w-3 h-3 rounded-full border border-emerald-400 inline-block" style={{ backgroundColor: '#f0fdf4' }} />, label: 'Saved' },
                        { swatch: <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#e0f2fe' }} />, label: 'Range' },
                      ].map(({ swatch, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          {swatch}
                          <span className="text-[10px] font-medium text-gray-600">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ════ BOTTOM: Saved Dates full width ════ */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Section header */}
                <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      {t.savedDates}
                      {savedDates.length > 0 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                          {savedDates.length}
                        </span>
                      )}
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => selectedDate && setShowLabelModal(true)}
                        disabled={!selectedDate || isDateSaved(selectedDate!)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
                          !selectedDate || isDateSaved(selectedDate!)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm shadow-blue-200'
                        )}
                      >
                        {selectedDate && isDateSaved(selectedDate) ? t.alreadySaved : t.saveDate}
                      </button>

                      <button
                        onClick={handleExportDates}
                        disabled={savedDates.length === 0}
                        className="px-3.5 py-1.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
                      >
                        {t.exportDates}
                      </button>

                      {rangeSelection.from && (
                        <>
                          <button
                            onClick={handleBulkSave}
                            className="px-3.5 py-1.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 active:scale-95 transition-all shadow-sm"
                          >
                            {t.saveRange}
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            className="px-3.5 py-1.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-sm"
                          >
                            {t.deleteRange}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* List or empty */}
                <div className="p-5">
                  {savedDates.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {savedDates.map((date, i) => {
                        const p = moonPhases.find((mp) =>
                          isSameDay(parseISO(mp.date), parseISO(date.date))
                        );
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-3 py-3.5 group first:pt-0 last:pb-0"
                          >
                            {/* Phase icon */}
                            <div className="mt-0.5 w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-base flex-shrink-0 group-hover:bg-white group-hover:border-gray-200 transition-all">
                              {p ? MOON_ICONS[p.phase] : '📅'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-snug">
                                {format(parseISO(date.date), 'EEEE, MMMM do yyyy')}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{format(parseISO(date.date), 'h:mm a')}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {date.label && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                                    🏷 {date.label}
                                  </span>
                                )}
                                {p && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                                    style={{
                                      backgroundColor: `${MOON_PHASES[p.phase].color}15`,
                                      color: MOON_PHASES[p.phase].color,
                                      borderColor: `${MOON_PHASES[p.phase].color}35`,
                                    }}
                                  >
                                    {MOON_ICONS[p.phase]} {getPhaseLabel(p.phase)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Delete */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDate(parseISO(date.date));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 active:scale-95"
                              aria-label="Delete date"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl mb-3 shadow-sm">
                        🌙
                      </div>
                      <p className="text-gray-600 font-semibold text-sm">{t.noSaved}</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">{t.saveDateCta}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* ════ Label Modal ════ */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl shadow-sm">
                🌙
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t.addLabelFor}</h3>
                {selectedDate && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {format(selectedDate, 'MMM dd, yyyy · h:mm a')}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowLabelModal(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveWithLabel()}
              placeholder={t.enterLabel}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white mb-5 transition-all"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowLabelModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-sm font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveWithLabel}
                className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:scale-95 transition-all text-sm font-semibold shadow-sm shadow-blue-200"
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