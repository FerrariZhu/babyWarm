'use client';

import { useLessonsAuth } from '@/lib/lessons/auth-context';
import type { ScheduleContext } from '@/lib/lessons/types';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function ScheduleContextBanner({
  context,
  dayIndex,
}: {
  context: ScheduleContext;
  dayIndex: number;
}) {
  const { user } = useLessonsAuth();

  if (context.role === 'admin' || context.role === 'moderator') {
    return (
      <div data-analytics-module="schedule_context" className="rounded-xl bg-tertiary-fixed px-4 py-3 font-body-md text-on-tertiary-fixed">
        Режим адміністратора — повний доступ до розкладу ({DAY_LABELS[dayIndex]}).
      </div>
    );
  }

  if (context.isSubstitutionDay) {
    return (
      <div data-analytics-module="schedule_context" className="rounded-xl bg-secondary-fixed px-4 py-3 font-body-md text-on-secondary-fixed">
        <p className="font-headline-md-mobile text-base">Сьогодні ви заміняєте вчителя</p>
        <p className="mt-1 text-sm opacity-90">
          Ви можете додавати, редагувати та видаляти уроки на цей день. Уроки, які ви
          створите, будуть привʼязані до вас ({user?.name ?? user?.email}).
        </p>
      </div>
    );
  }

  if (context.isBaseTeacher && context.canCreate) {
    return (
      <div data-analytics-module="schedule_context" className="rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface-variant">
        Ви основний вчитель на {DAY_LABELS[dayIndex]}.
      </div>
    );
  }

  if (!context.canCreate && !context.canEdit) {
    return (
      <div data-analytics-module="schedule_context" className="rounded-xl bg-surface-container-low px-4 py-3 font-body-md text-on-surface-variant">
        Перегляд розкладу — редагування недоступне.
      </div>
    );
  }

  return null;
}
