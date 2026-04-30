import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon } from '../components/icons';

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  time: string;
  location?: string;
  type: 'event' | 'pooja' | 'hall_booking';
}

interface CalendarData {
  date: string;
  events: CalendarEvent[];
  pooja: CalendarEvent[];
  hallBookings: CalendarEvent[];
}

interface CalendarProps {
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  showDatePicker?: boolean;
}

export default function Calendar({ selectedDate, onDateSelect, showDatePicker = true }: CalendarProps) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);

  // Translation object
  const t = {
    tamil: {
      calendar: 'நாட்காட்டி',
      events: 'நிகழ்வுகள்',
      pooja: 'பூஜை',
      hallBookings: 'ஹால் பதிவுகள்',
      noEvents: 'இன்று நிகழ்வுகள் இல்லை',
      time: 'நேரம்',
      location: 'இடம்',
      loading: 'ஏற்றுகிறது…',
      error: 'பிழை',
      selectDate: 'தேதியைத் தேர்ந்தெடுக்கவும்',
    },
    english: {
      calendar: 'Calendar',
      events: 'Events',
      pooja: 'Pooja',
      hallBookings: 'Hall Bookings',
      noEvents: 'No events today',
      time: 'Time',
      location: 'Location',
      loading: 'Loading…',
      error: 'Error',
      selectDate: 'Select Date',
    },
  } as const;

  const fetchCalendarData = async (date: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/calendar/${date}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch calendar data');
      
      setCalendarData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentDate) {
      fetchCalendarData(currentDate);
    }
  }, [currentDate, token]);

  const handleDateChange = (date: string) => {
    setCurrentDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <CalendarIcon className="h-4 w-4" />;
      case 'pooja':
        return <ClockIcon className="h-4 w-4" />;
      case 'hall_booking':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pooja':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'hall_booking':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    // Convert 24-hour format to 12-hour format if needed
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const allEvents = [
    ...(calendarData?.events || []),
    ...(calendarData?.pooja || []),
    ...(calendarData?.hallBookings || [])
  ].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t[lang].calendar}</h3>
          {showDatePicker && (
            <input
              type="date"
              value={currentDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-500">{t[lang].loading}</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">{t[lang].error}: {error}</div>
          </div>
        ) : allEvents.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-500">{t[lang].noEvents}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event, index) => (
              <div
                key={`${event.type}-${event.id}-${index}`}
                className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {event.title || event.name || event.event}
                      </div>
                      {event.description && (
                        <div className="text-xs mt-1 opacity-75">
                          {event.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        {event.time && (
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatTime(event.time)}</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center space-x-1">
                            <MapPinIcon className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                      {event.type === 'event' ? t[lang].events : 
                       event.type === 'pooja' ? t[lang].pooja : 
                       t[lang].hallBookings}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
