"use client";

import { useEffect, useState, useTransition } from "react";
import { listUserDressingRecords } from "@/app/admin/users/actions";
import {
  formatDateTime,
  formatRecordedDate,
  type AdminDressingRecord,
} from "@/lib/admin/user-types";

export function UserDressingRecords({
  userId,
  isAppUser,
}: {
  userId: string;
  isAppUser: boolean;
}) {
  const [records, setRecords] = useState<AdminDressingRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isAppUser) {
      setRecords([]);
      return;
    }
    startTransition(async () => {
      const result = await listUserDressingRecords(userId);
      if (!result.ok) {
        setError(result.error);
        setRecords([]);
        return;
      }
      setError(null);
      setRecords(result.data);
    });
  }, [userId, isAppUser]);

  return (
    <section className="mt-6">
      <h3 className="font-label-md mb-3 text-on-surface">
        穿衣记录
        {records && records.length > 0 ? ` · ${records.length} 条` : ""}
        {pending ? " · 加载中…" : ""}
      </h3>
      {!isAppUser ? (
        <p className="font-body-md text-text-soft">手动录入用户没有 C 端穿衣记录。</p>
      ) : error ? (
        <p role="alert" className="font-body-md text-error">
          {error}
        </p>
      ) : records == null || pending ? (
        <p className="font-body-md text-text-soft">正在加载穿衣记录…</p>
      ) : records.length === 0 ? (
        <p className="font-body-md text-text-soft">该用户尚未保存穿衣记录。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-label-md text-on-surface">
                  {formatRecordedDate(record.recordedDate)}
                  <span className="font-label-sm ml-2 text-text-soft">{record.babyName}</span>
                </p>
                <p className="font-label-sm text-text-soft">
                  保存于 {formatDateTime(record.savedAt)}
                </p>
              </div>
              <p className="font-body-md mb-3 text-on-surface-variant">
                {[
                  record.conditionText,
                  record.temp != null ? `${Math.round(record.temp)}°C` : null,
                  `穿衣指数 ${record.requiredWarmth}`,
                  record.locationLabel,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <dl className="grid gap-2 sm:grid-cols-3">
                <div>
                  <dt className="font-label-sm text-text-soft">家里穿</dt>
                  <dd className="font-body-md mt-0.5 text-on-surface">
                    {record.indoorSummary || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-label-sm text-text-soft">出门再加</dt>
                  <dd className="font-body-md mt-0.5 text-on-surface">
                    {record.outdoorSummary || "出门不用再加衣服。"}
                  </dd>
                </div>
                <div>
                  <dt className="font-label-sm text-text-soft">记得带</dt>
                  <dd className="font-body-md mt-0.5 text-on-surface">
                    {record.extrasSummary || "—"}
                  </dd>
                </div>
              </dl>
              {record.reason ? (
                <p className="font-body-md mt-3 leading-relaxed text-on-surface-variant">
                  {record.reason}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
