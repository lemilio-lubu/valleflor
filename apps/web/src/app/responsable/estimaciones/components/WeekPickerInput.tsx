'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import {
  format,
  getWeek,
  getWeekYear,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-day-picker/dist/style.css';

export interface WeekValue {
  numero_semana: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
}

interface Props {
  value: WeekValue | null;
  onChange: (val: WeekValue) => void;
}

const WEEK_OPTIONS = { weekStartsOn: 1 as const, locale: es };

function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK_OPTIONS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function WeekPickerInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Date | null>(null);

  const selectedAnchor = value ? new Date(`${value.fecha_inicio}T12:00:00`) : null;

  const handleDayClick = (day: Date) => {
    onChange({
      numero_semana: getWeek(day, WEEK_OPTIONS),
      anio: getWeekYear(day, WEEK_OPTIONS),
      fecha_inicio: format(startOfWeek(day, WEEK_OPTIONS), 'yyyy-MM-dd'),
      fecha_fin: format(endOfWeek(day, WEEK_OPTIONS), 'yyyy-MM-dd'),
    });
    setOpen(false);
  };

  const hoveredDays = hovered ? weekDays(hovered) : [];
  const selectedDays = selectedAnchor ? weekDays(selectedAnchor) : [];

  const label = value
    ? `Sem. ${value.numero_semana}  ·  ${format(
        new Date(`${value.fecha_inicio}T12:00:00`), 'd MMM', { locale: es }
      )} – ${format(new Date(`${value.fecha_fin}T12:00:00`), 'd MMM yyyy', { locale: es })}`
    : 'Seleccionar semana';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field w-full text-left flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-carbon-50' : 'text-carbon-400 text-sm'}>{label}</span>
        <CalendarDays className="w-4 h-4 text-carbon-400 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 top-full left-0 mt-2 bg-surface-raised border border-surface-border rounded-xl shadow-lg p-3 week-picker-popover">
            <DayPicker
              locale={es}
              weekStartsOn={1}
              showWeekNumber
              defaultMonth={selectedAnchor ?? new Date()}
              modifiers={{
                hovered_week: (day: Date) => hoveredDays.some((d) => isSameDay(d, day)),
                selected_week: (day: Date) => selectedDays.some((d) => isSameDay(d, day)),
              }}
              modifiersStyles={{
                hovered_week: {
                  backgroundColor: 'rgba(74,197,110,0.12)',
                  borderRadius: 0,
                },
                selected_week: {
                  backgroundColor: 'rgba(74,197,110,0.28)',
                  borderRadius: 0,
                  color: 'white',
                  fontWeight: 600,
                },
              }}
              classNames={{
                root: 'text-sm select-none',
                months: 'flex flex-col',
                month: 'space-y-2',
                caption: 'flex justify-center items-center relative h-9 px-8',
                caption_label: 'text-sm font-semibold text-carbon-50 capitalize',
                nav: 'absolute inset-x-0 flex justify-between px-1 top-1',
                nav_button:
                  'h-7 w-7 flex items-center justify-center text-carbon-400 hover:text-carbon-50 hover:bg-surface-overlay rounded-md transition-colors',
                nav_button_previous: '',
                nav_button_next: '',
                table: 'w-full border-collapse',
                head_row: 'flex items-center',
                head_cell: 'text-carbon-400 w-8 text-[11px] font-medium text-center pb-1',
                row: 'flex w-full',
                cell: 'relative p-0 w-8 h-8',
                day: 'h-8 w-8 p-0 font-normal text-carbon-200 hover:bg-transparent transition-colors flex items-center justify-center cursor-pointer rounded-none',
                day_today: 'text-verde-400 font-bold',
                day_outside: 'text-carbon-500 opacity-40',
                day_disabled: 'opacity-20 cursor-default',
                day_hidden: 'invisible',
                weeknumber: 'text-carbon-500 text-[11px] w-7 flex items-center justify-end pr-1 opacity-60',
              }}
              components={{
                IconLeft: () => <ChevronLeft className="w-4 h-4" />,
                IconRight: () => <ChevronRight className="w-4 h-4" />,
              }}
              onDayClick={handleDayClick}
              onDayMouseEnter={(day: Date) => setHovered(day)}
              onDayMouseLeave={() => setHovered(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
