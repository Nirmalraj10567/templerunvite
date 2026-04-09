import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/icons';

interface GlobalEvent {
  id: number;
  title: string;
  description: string;
  time: string;
  location: string;
  date: string;
  type: 'event' | 'pooja' | 'hall_booking';
}

interface GlobalCalendarProps {
  showPagination?: boolean;
  itemsPerPage?: number;
}

export default function GlobalCalendar({ showPagination = true, itemsPerPage = 20 }: GlobalCalendarProps) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Translation object
  const t = {
    tamil: {
      globalCalendar: 'முழு நாட்காட்டி',
      allEvents: 'அனைத்து நிகழ்வுகள்',
      events: 'நிகழ்வுகள்',
      pooja: 'பூஜை',
      hallBookings: 'ஹால் பதிவுகள்',
      noEvents: 'நிகழ்வுகள் இல்லை',
      time: 'நேரம்',
      location: 'இடம்',
      date: 'தேதி',
      loading: 'ஏற்றுகிறது…',
      error: 'பிழை',
      previous: 'முந்தைய',
      next: 'அடுத்து',
      page: 'பக்கம்',
      of: 'இல்',
      showAll: 'அனைத்தையும் காட்டு',
    },
    english: {
      globalCalendar: 'Global Calendar',
      allEvents: 'All Events',
      events: 'Events',
      pooja: 'Pooja',
      hallBookings: 'Hall Bookings',
      noEvents: 'No events found',
      time: 'Time',
      location: 'Location',
      date: 'Date',
      loading: 'Loading…',
      error: 'Error',
      previous: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
      showAll: 'Show All',
    },
  } as const;

  const fetchAllEvents = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`http://localhost:4000/api/calendar/all?limit=${itemsPerPage}&offset=${offset}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to fetch calendar data');
      
      setEvents(data.data);
      setTotalItems(data.total);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents(1);
  }, [token]);

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
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t[lang].globalCalendar}</h3>
          <span className="text-sm text-slate-500">
            {totalItems} {t[lang].allEvents.toLowerCase()}
          </span>
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
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-500">{t[lang].noEvents}</div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={`${event.type}-${event.id}-${index}`}
                  className={`p-4 rounded-lg border ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1">
                          {event.title}
                        </div>
                        {event.description && (
                          <div className="text-xs mb-2 opacity-75">
                            {event.description}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{formatDate(event.date)}</span>
                          </div>
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

            {showPagination && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchAllEvents(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-1 px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span>{t[lang].previous}</span>
                  </button>
                  
                  <span className="text-sm text-slate-600">
                    {t[lang].page} {currentPage} {t[lang].of} {totalPages}
                  </span>
                  
                  <button
                    onClick={() => fetchAllEvents(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-1 px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{t[lang].next}</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-sm text-slate-500">
                  {totalItems} {t[lang].allEvents.toLowerCase()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
