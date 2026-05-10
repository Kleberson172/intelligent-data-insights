import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, Star } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarEvent {
  date: Date;
  type: "anomaly" | "forecast" | "milestone";
  label: string;
}

const EVENTS: CalendarEvent[] = [
  { date: new Date(2026, 4, 3), type: "anomaly", label: "Anomalia: Queda Luanda -23%" },
  { date: new Date(2026, 4, 8), type: "milestone", label: "Meta trimestral atingida" },
  { date: new Date(2026, 4, 15), type: "forecast", label: "Previsão pico vendas" },
  { date: new Date(2026, 4, 22), type: "anomaly", label: "Anomalia: Benguela +41%" },
  { date: new Date(2026, 4, 28), type: "forecast", label: "Atualização modelo IA" },
  { date: new Date(2026, 5, 5), type: "milestone", label: "Revisão mensal" },
  { date: new Date(2026, 5, 12), type: "forecast", label: "Previsão Junho" },
  { date: new Date(2026, 5, 18), type: "anomaly", label: "Anomalia: Cabinda -18%" },
];

const typeConfig = {
  anomaly: { color: "bg-amber-500", dot: "bg-amber-400", icon: AlertTriangle, text: "text-amber-400" },
  forecast: { color: "bg-primary", dot: "bg-primary", icon: TrendingUp, text: "text-primary" },
  milestone: { color: "bg-emerald-500", dot: "bg-emerald-400", icon: Star, text: "text-emerald-400" },
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1));
  const [selected, setSelected] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = monthStart.getDay();
  const totalCells = Math.ceil((startPad + days.length) / 7) * 7;
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
    ...Array(totalCells - startPad - days.length).fill(null),
  ];

  const getEventsForDay = (date: Date) => EVENTS.filter(e => isSameDay(e.date, date));

  const selectedEvents = selected ? getEventsForDay(selected) : [];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-9" />;

          const events = getEventsForDay(day);
          const isSelected = selected && isSameDay(day, selected);
          const today = isToday(day);

          return (
            <button
              key={i}
              onClick={() => setSelected(isSelected ? null : day)}
              className={`
                relative h-9 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all
                ${isSelected ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(56,189,248,0.4)]" : ""}
                ${today && !isSelected ? "ring-1 ring-primary/50 text-primary" : ""}
                ${!isSelected && !today ? "text-foreground hover:bg-muted" : ""}
                ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
              `}
            >
              {day.getDate()}
              {events.length > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {events.slice(0, 3).map((e, j) => (
                    <span key={j} className={`w-1 h-1 rounded-full ${typeConfig[e.type].dot}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Events */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground font-medium capitalize">
                {format(selected, "d 'de' MMMM", { locale: ptBR })}
              </p>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sem eventos</p>
              ) : (
                selectedEvents.map((event, i) => {
                  const cfg = typeConfig[event.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.text}`} />
                      <span className="text-foreground/80">{event.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/50">
        {Object.entries(typeConfig).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {type === "anomaly" ? "Anomalia" : type === "forecast" ? "Previsão" : "Meta"}
          </div>
        ))}
      </div>
    </div>
  );
}
