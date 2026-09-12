'use client';

import type { LessonWithFlags } from '@/lib/lessons/types';

export function LessonListItem({
  lesson,
  onEdit,
  onDelete,
}: {
  lesson: LessonWithFlags;
  onEdit: (lesson: LessonWithFlags) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li data-analytics-module="lesson_list" className="flex items-start justify-between gap-3 rounded-xl bg-surface-container-lowest p-4 cloud-shadow">
      <div className="min-w-0 flex-1">
        <p className="font-body-md font-medium text-on-surface">{lesson.title}</p>
        {lesson.goal ? (
          <p className="mt-1 font-body-md text-sm text-on-surface-variant line-clamp-2">{lesson.goal}</p>
        ) : null}
        {lesson.isOwn ? (
          <span className="font-label-caps mt-2 inline-block rounded-full bg-primary-container px-3 py-1 text-on-primary-container">
            Мій урок
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {lesson.canEdit ? (
          <button
            type="button"
            data-analytics-action="edit_lesson"
            onClick={() => onEdit(lesson)}
            className="font-label-caps rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-low active:scale-95"
          >
            Редагувати
          </button>
        ) : null}
        {lesson.canDelete ? (
          <button
            type="button"
            data-analytics-action="delete_lesson"
            onClick={() => onDelete(lesson.id)}
            className="font-label-caps rounded-full border border-secondary/30 bg-secondary-fixed px-4 py-2 text-sm text-on-secondary-fixed transition-colors hover:opacity-90 active:scale-95"
          >
            Видалити
          </button>
        ) : null}
      </div>
    </li>
  );
}
