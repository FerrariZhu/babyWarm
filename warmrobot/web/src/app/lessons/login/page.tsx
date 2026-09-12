'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginLessonsApi } from '@/lib/lessons/api';
import { useLessonsAuth } from '@/lib/lessons/auth-context';
import { MaterialIcon } from '@/components/stitch/material-icon';

export default function LessonsLoginPage() {
  const { setAuth } = useLessonsAuth();
  const router = useRouter();
  const [email, setEmail] = useState('teacher-b@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loginLessonsApi(email, password);
      setAuth(data);
      router.push('/lessons/day/2');
    } catch {
      setError('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-margin-mobile">
      <div data-analytics-module="lessons_login_form" className="w-full max-w-md rounded-[2rem] border border-surface-container-highest bg-surface-container-lowest p-8 cloud-shadow">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <MaterialIcon name="calendar_month" className="text-[32px]" filled />
          </div>
          <h1 className="font-display-lg-mobile text-primary">Розклад уроків</h1>
          <p className="mt-2 font-body-md text-on-surface-variant">Увійдіть, щоб переглянути розклад</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="lessons-email" className="mb-1 block font-label-caps text-on-surface-variant">
              Email
            </label>
            <input
              id="lessons-email"
              type="email"
              className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="lessons-password" className="mb-1 block font-label-caps text-on-surface-variant">
              Пароль
            </label>
            <input
              id="lessons-password"
              type="password"
              className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-xl bg-secondary-fixed px-3 py-2 font-body-md text-on-secondary-fixed" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            data-analytics-action="submit_login"
            disabled={loading}
            className="font-label-caps min-h-touch-target-min w-full rounded-full bg-primary py-3 text-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? '…' : 'Увійти'}
          </button>
        </form>

        <p className="mt-6 text-center font-body-md text-sm text-on-surface-variant">
          Demo: teacher-b@example.com (замінник у середу), admin@example.com
        </p>
      </div>
    </div>
  );
}
