import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { poojaService, PoojaBooking } from '@/services/poojaService';

interface PoojaCalendarProps {
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
  className?: string;
  showBookingTimes?: boolean;
}

export default function PoojaCalendar({ 
  onDateSelect, 
  selectedDate, 
  className = '',
  showBookingTimes = true
}: PoojaCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<PoojaBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { language } = useLanguage();

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  // Fetch bookings for current month
  const fetchBookings = async (year: number, month: number) => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const result = await poojaService.getBookings(year, month);
      setBookings(result.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(currentDate.getFullYear(), currentDate.getMonth() + 1);
  }, [currentDate, token]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getBookingsForDate = (date: string) => {
    return bookings.filter(booking => {
      // Parse dates without timezone issues
      const bookingStart = new Date(booking.from_date + 'T00:00:00');
      const bookingEnd = new Date(booking.to_date + 'T23:59:59');
      const checkDate = new Date(date + 'T12:00:00');
      
      return checkDate >= bookingStart && checkDate <= bookingEnd;
    });
  };

  const isDateBooked = (date: string) => {
    return getBookingsForDate(date).length > 0;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date);
    onDateSelect?.(dateStr);
  };

  const monthNames = [
    t('January', 'ஜனவரி'), t('February', 'பிப்ரவரி'), t('March', 'மார்ச்'),
    t('April', 'ஏப்ரல்'), t('May', 'மே'), t('June', 'ஜூன்'),
    t('July', 'ஜூலை'), t('August', 'ஆகஸ்ட்'), t('September', 'செப்டம்பர்'),
    t('October', 'அக்டோபர்'), t('November', 'நவம்பர்'), t('December', 'டிசம்பர்')
  ];

  const dayNames = [
    t('Sun', 'ஞா'), t('Mon', 'தி'), t('Tue', 'செ'), t('Wed', 'பு'),
    t('Thu', 'வி'), t('Fri', 'வெ'), t('Sat', 'ச')
  ];

  const days = getDaysInMonth(currentDate);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {t('Pooja Bookings Calendar', 'பூஜை பதிவு காலெண்டர்')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">
              {t('Loading bookings...', 'பதிவுகளை ஏற்றுகிறது...')}
            </div>
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={index} className="h-10" />;
                }
                
                const dateStr = formatDate(day);
                const isBooked = isDateBooked(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === formatDate(new Date());
                const dayBookings = getBookingsForDate(dateStr);
                
                return (
                  <div
                    key={index}
                    className={`
                      h-10 flex flex-col items-center justify-center text-xs cursor-pointer rounded-md border
                      ${isSelected 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : isBooked 
                          ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                          : isToday
                            ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                            : 'hover:bg-gray-100 border-transparent'
                      }
                    `}
                    onClick={() => handleDateClick(day)}
                  >
                    <span className="font-medium">{day.getDate()}</span>
                    {dayBookings.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1 py-0 h-4 mt-0.5"
                      >
                        {dayBookings.length}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Selected Date Booking Times */}
            {showBookingTimes && selectedDate && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  {t('Bookings for', 'பதிவுகள்')} {new Date(selectedDate).toLocaleDateString()}
                </h4>
                {(() => {
                  const dayBookings = getBookingsForDate(selectedDate);
                  if (dayBookings.length === 0) {
                    return (
                      <p className="text-sm text-green-600">
                        {t('No bookings - Available all day', 'பதிவுகள் இல்லை - முழு நாளும் கிடைக்கும்')}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-1">
                      {dayBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{booking.time}</span>
                          <span className="text-gray-600">{booking.name}</span>
                          <span className="text-xs text-gray-500">({booking.receipt_number})</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>{t('Booked', 'பதிவு செய்யப்பட்டது')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>{t('Today', 'இன்று')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>{t('Selected', 'தேர்ந்தெடுக்கப்பட்டது')}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
