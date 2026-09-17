import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Receipt } from 'lucide-react';
import { Expense, CalendarResponse } from '../types';
import { formatPaise, getCategoryIconComponent } from '../utils/formatters';
import { api } from '../services/api';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayExpenses, setSelectedDayExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCalendar(monthStr);
      setCalendarData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    setSelectedDate(null);
    setSelectedDayExpenses([]);
  }, [monthStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSelectDay = async (dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      const expenses = await api.getExpenses({ date_from: dateStr, date_to: dateStr });
      setSelectedDayExpenses(expenses);
    } catch (err) {
      console.error(err);
    }
  };

  // Generate calendar days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push(dayStr);
  }

  const monthTitle = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* HEADER WITH CONTROLS */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Calendar View
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Day-by-day expense timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
            {monthTitle}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((dayStr, idx) => {
            if (!dayStr) {
              return <div key={`empty-${idx}`} className="h-16 sm:h-20" />;
            }

            const dayNumber = parseInt(dayStr.split('-')[2], 10);
            const dayData = calendarData?.days[dayStr];
            const isSelected = selectedDate === dayStr;
            const isToday = dayStr === new Date().toISOString().slice(0, 10);

            return (
              <button
                key={dayStr}
                onClick={() => handleSelectDay(dayStr)}
                className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                    : isToday
                    ? 'border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800/40'
                    : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {dayData && dayData.transaction_count > 0 && (
                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                      {dayData.transaction_count} exp
                    </span>
                  )}
                </div>

                {dayData && dayData.total_spent_paise > 0 ? (
                  <div className="text-[10px] sm:text-xs font-extrabold text-rose-600 dark:text-rose-400 truncate">
                    {formatPaise(dayData.total_spent_paise)}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-300 dark:text-slate-600">-</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY EXPENSES MODAL / DRAWER */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Expenses on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No expenses recorded on this day.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedDayExpenses.map((exp) => {
                const IconComp = getCategoryIconComponent(exp.category?.icon || 'tag');
                return (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${exp.category?.color || '#6366f1'}15`, color: exp.category?.color || '#6366f1' }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {exp.description || exp.category?.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {exp.category?.name} • {exp.payment_method} {exp.time ? `• ${exp.time}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {formatPaise(exp.amount_paise)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
