'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLessonsAuth } from '@/lib/lessons/auth-context';
import {
  createLesson,
  deleteLesson,
  fetchLessonsForDay,
  fetchScheduleContext,
  updateLesson,
} from '@/lib/lessons/api';
import type { LessonWithFlags, ScheduleContext } from '@/lib/lessons/types';
import { ScheduleContextBanner } from '@/components/lessons/schedule-context-banner';
import { LessonListItem } from '@/components/lessons/lesson-list-item';
import { MaterialIcon } from '@/components/stitch/material-icon';
import { PageLoadingSkeleton } from '@/components/stitch/page-loading-skeleton';

const DAY_LABELS = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота', 'Неділя'];

const inputClassName =
  'font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';

export function LessonsDayPage({ dayIndex }: { dayIndex: number }) {
  const { accessToken } = useLessonsAuth();
  const [context, setContext] = useState<ScheduleContext | null>(null);
  const [lessons, setLessons] = useState<LessonWithFlags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [editing, setEditing] = useState<LessonWithFlags | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [ctx, list] = await Promise.all([
        fetchScheduleContext(accessToken, dayIndex),
        fetchLessonsForDay(accessToken, dayIndex),
      ]);
      setContext(ctx);
      setLessons(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [accessToken, dayIndex]);

  useEffect(() => {
    void load();
  }, [load]);

  const canAdd = context?.canCreate ?? false;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !title.trim()) return;
    try {
      await createLesson(accessToken, { dayIndex, title: title.trim(), goal: goal.trim() || undefined });
      setTitle('');
      setGoal('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося створити урок');
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !editing) return;
    try {
      await updateLesson(accessToken, editing.id, {
        title: title.trim(),
        goal: goal.trim() || null,
      });
      setEditing(null);
      setTitle('');
      setGoal('');
      await load();
    } catch {
      setError('Не вдалося оновити урок');
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken || !confirm('Видалити урок?')) return;
    try {
      await deleteLesson(accessToken, id);
      await load();
    } catch {
      setError('Не вдалося видалити урок');
    }
  }

  function startEdit(lesson: LessonWithFlags) {
    setEditing(lesson);
    setTitle(lesson.title);
    setGoal(lesson.goal ?? '');
    setShowForm(true);
  }

  if (!accessToken) {
    return (
      <main data-analytics-module="lessons_auth_required" className="mt-6 flex w-full max-w-[1200px] flex-col gap-6 px-margin-mobile md:px-margin-desktop">
        <section className="rounded-xl bg-surface-container-lowest p-8 text-center cloud-shadow">
          <MaterialIcon name="lock" className="mb-3 text-[48px] text-primary/40" />
          <p className="font-body-md text-on-surface-variant">
            Увійдіть, щоб переглянути розклад.
          </p>
          <Link
            href="/lessons/login"
            className="font-label-caps mt-4 inline-flex min-h-touch-target-min items-center justify-center rounded-full bg-primary px-8 text-on-primary transition hover:opacity-90"
          >
            Увійти
          </Link>
        </section>
      </main>
    );
  }

  if (loading && !context) {
    return <PageLoadingSkeleton />;
  }

  return (
    <main data-analytics-module="lessons_schedule" className="mt-6 flex w-full max-w-[1200px] flex-col gap-6 px-margin-mobile md:px-margin-desktop">
      <header>
        <h1 className="font-headline-md-mobile text-on-background">
          {DAY_LABELS[dayIndex] ?? dayIndex}
        </h1>
      </header>

      {context ? <ScheduleContextBanner context={context} dayIndex={dayIndex} /> : null}

      {error ? (
        <p className="rounded-xl bg-secondary-fixed px-4 py-3 font-body-md text-on-secondary-fixed" role="alert">
          {error}
        </p>
      ) : null}

      {canAdd && !showForm ? (
        <button
          type="button"
          data-analytics-action="open_create_lesson"
          onClick={() => {
            setEditing(null);
            setTitle('');
            setGoal('');
            setShowForm(true);
          }}
          className="font-label-caps inline-flex min-h-touch-target-min items-center gap-2 self-start rounded-full bg-primary px-6 py-3 text-on-primary transition hover:opacity-90 active:scale-95"
        >
          <MaterialIcon name="add" className="text-[20px]" />
          Додати урок
        </button>
      ) : null}

      {showForm && canAdd ? (
        <form
          onSubmit={editing ? handleUpdate : handleCreate}
          data-analytics-module="lesson_editor"
          className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-6 cloud-shadow"
        >
          <h2 className="font-headline-md-mobile text-on-surface">
            {editing ? 'Редагувати урок' : 'Новий урок'}
          </h2>
          <div>
            <label htmlFor="lesson-title" className="mb-1 block font-label-caps text-on-surface-variant">
              Назва
            </label>
            <input
              id="lesson-title"
              className={inputClassName}
              placeholder="Назва уроку"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lesson-goal" className="mb-1 block font-label-caps text-on-surface-variant">
              Мета
            </label>
            <textarea
              id="lesson-goal"
              className={`${inputClassName} min-h-[96px] resize-y`}
              placeholder="Мета уроку"
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              data-analytics-action="save_lesson"
              className="font-label-caps min-h-touch-target-min rounded-full bg-primary px-6 py-3 text-on-primary transition hover:opacity-90 active:scale-95"
            >
              {editing ? 'Зберегти' : 'Створити'}
            </button>
            <button
              type="button"
              data-analytics-action="cancel_edit"
              className="font-label-caps min-h-touch-target-min rounded-full border border-outline-variant bg-surface-container-lowest px-6 py-3 text-on-surface transition hover:bg-surface-container-low active:scale-95"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Скасувати
            </button>
          </div>
        </form>
      ) : null}

      <ul className="flex flex-col gap-4">
        {lessons.length === 0 ? (
          <li className="rounded-xl bg-surface-container-lowest p-8 text-center cloud-shadow">
            <MaterialIcon name="event_busy" className="mb-3 text-[48px] text-primary/30" />
            <p className="font-body-md text-on-surface-variant">Уроків поки немає.</p>
          </li>
        ) : (
          lessons.map((lesson) => (
            <LessonListItem
              key={lesson.id}
              lesson={lesson}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ul>
    </main>
  );
}
