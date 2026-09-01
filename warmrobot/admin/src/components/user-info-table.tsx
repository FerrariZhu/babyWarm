"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import {
  createManualUserRecord,
  deleteManualUserRecord,
  saveAppUserProfile,
  updateManualUserRecord,
} from "@/app/admin/users/actions";
import {
  activityLabel,
  formatCoord,
  formatDateTime,
  GENDER_OPTIONS,
  genderLabel,
  isAppSignupSource,
  sourceLabel,
  type AdminUserRecord,
  WARMTH_PREFERENCE_OPTIONS,
  warmthPreferenceLabel,
} from "@/lib/admin/user-types";
import { MaterialIcon } from "@/components/material-icon";
import { UserDressingRecords } from "@/components/user-dressing-records";

type Props = {
  initialUsers: AdminUserRecord[];
};

const emptyManualForm = {
  parent_name: "",
  wechat_id: "",
  email: "",
  city: "",
  admin_notes: "",
  baby_name: "",
  baby_birth_date: "",
  baby_gender: "unknown",
  baby_height_cm: "",
  baby_weight_kg: "",
  baby_warmth_preference: "neutral",
};

export function UserInfoTable({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyManualForm);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = [
        user.email,
        user.display_name,
        user.wechat_id,
        user.wechat_openid,
        user.wechat_unionid,
        user.city,
        user.admin_notes,
        ...user.babies.map((b) => b.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  function run<T>(action: () => Promise<{ ok: boolean; error?: string; data?: T }>, onOk?: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "操作失败");
        return;
      }
      if (result.data !== undefined) onOk?.(result.data as T);
    });
  }

  function upsertUser(record: AdminUserRecord) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === record.id);
      if (idx === -1) return [record, ...prev];
      return prev.map((u) => (u.id === record.id ? record : u));
    });
  }

  function removeUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error-container/50 px-4 py-3 font-body-md text-on-error-container"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-label-sm text-text-soft">
          共 {filtered.length} 条记录
          {pending ? " · 保存中…" : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-text-soft"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称、邮箱、微信、宝宝…"
              className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pr-3 pl-10 text-on-surface outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="font-label-md inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-on-primary"
          >
            <MaterialIcon name="person_add" className="text-[18px]" />
            新建记录
          </button>
        </div>
      </div>

      {showCreate && (
        <ManualUserForm
          title="新建用户信息"
          form={createForm}
          onChange={setCreateForm}
          onCancel={() => {
            setShowCreate(false);
            setCreateForm(emptyManualForm);
          }}
          onSubmit={() =>
            run(
              () =>
                createManualUserRecord({
                  parent_name: createForm.parent_name,
                  wechat_id: createForm.wechat_id || null,
                  email: createForm.email || null,
                  city: createForm.city || null,
                  admin_notes: createForm.admin_notes || null,
                  baby_name: createForm.baby_name || null,
                  baby_birth_date: createForm.baby_birth_date || null,
                  baby_gender: createForm.baby_gender || null,
                  baby_height_cm: parseOptionalNumber(createForm.baby_height_cm),
                  baby_weight_kg: parseOptionalNumber(createForm.baby_weight_kg),
                  baby_warmth_preference: createForm.baby_warmth_preference || null,
                }),
              (record) => {
                upsertUser(record);
                setShowCreate(false);
                setCreateForm(emptyManualForm);
                setExpandedId(record.id);
              }
            )
          }
          pending={pending}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-sm">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low">
              <th className="font-label-sm px-4 py-3 text-text-soft">来源</th>
              <th className="font-label-sm px-4 py-3 text-text-soft">用户</th>
              <th className="font-label-sm px-4 py-3 text-text-soft">微信</th>
              <th className="font-label-sm px-4 py-3 text-text-soft">城市</th>
              <th className="font-label-sm px-4 py-3 text-text-soft">宝宝档案</th>
              <th className="font-label-sm px-4 py-3 text-text-soft">更新时间</th>
              <th className="font-label-sm px-4 py-3 text-text-soft" aria-label="操作" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const expanded = expandedId === user.id;
              const activeBaby = user.babies.find((b) => b.is_active) ?? user.babies[0];
              const wechatDisplay = user.wechat_id || user.wechat_openid;
              return (
                <Fragment key={user.id}>
                  <tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/60">
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`font-label-sm rounded px-2 py-0.5 ${
                          isAppSignupSource(user.source)
                            ? "bg-secondary-container/60 text-on-secondary-container"
                            : "bg-tertiary-fixed/60 text-on-tertiary-fixed"
                        }`}
                      >
                        {sourceLabel(user.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-label-md text-on-surface">
                        {user.display_name || "（未设置名称）"}
                      </p>
                      <p className="font-label-sm mt-0.5 font-mono text-text-soft">
                        {user.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-label-sm text-on-surface-variant">
                        {wechatDisplay || "—"}
                      </p>
                    </td>
                    <td className="font-label-sm px-4 py-3 align-top text-on-surface-variant">
                      {user.city || "—"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {user.babies.length === 0 ? (
                        <span className="font-label-sm text-text-soft">暂无</span>
                      ) : (
                        <div>
                          <p className="font-label-md text-on-surface">
                            {activeBaby?.name}
                            {activeBaby?.fromApp && activeBaby.is_active ? (
                              <span className="font-label-sm ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                                C 端
                              </span>
                            ) : null}
                          </p>
                          <p className="font-label-sm mt-0.5 text-text-soft">
                            {user.babies.length > 1
                              ? `共 ${user.babies.length} 个宝宝`
                              : formatBabySummary(activeBaby)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="font-label-sm px-4 py-3 align-top text-on-surface-variant">
                      {formatDateTime(user.updated_at || user.created_at)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : user.id)}
                        className="font-label-sm inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary hover:bg-primary/10"
                        aria-expanded={expanded}
                      >
                        {expanded ? "收起" : "详情"}
                        <MaterialIcon
                          name={expanded ? "expand_less" : "expand_more"}
                          className="text-[18px]"
                        />
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-outline-variant/30">
                      <td colSpan={7} className="bg-surface-container-low/40 px-4 py-4">
                        {isAppSignupSource(user.source) ? (
                          <AppUserEditor
                            user={user}
                            pending={pending}
                            onSave={(patch) =>
                              run(
                                () => saveAppUserProfile({ id: user.id, ...patch }),
                                upsertUser
                              )
                            }
                          />
                        ) : (
                          <>
                            <ManualUserEditor
                              user={user}
                              pending={pending}
                              onSave={(form) =>
                                run(
                                  () =>
                                    updateManualUserRecord({
                                      id: user.id,
                                      parent_name: form.parent_name,
                                      wechat_id: form.wechat_id || null,
                                      email: form.email || null,
                                      city: form.city || null,
                                      admin_notes: form.admin_notes || null,
                                      baby_name: form.baby_name || null,
                                      baby_birth_date: form.baby_birth_date || null,
                                      baby_gender: form.baby_gender || null,
                                      baby_height_cm: parseOptionalNumber(form.baby_height_cm),
                                      baby_weight_kg: parseOptionalNumber(form.baby_weight_kg),
                                      baby_warmth_preference: form.baby_warmth_preference || null,
                                    }),
                                  upsertUser
                                )
                              }
                              onDelete={() =>
                                run(() => deleteManualUserRecord(user.id), () => removeUser(user.id))
                              }
                            />
                            <UserDressingRecords userId={user.id} isAppUser={false} />
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="font-body-md px-4 py-10 text-center text-text-soft">
                  没有匹配的用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppUserEditor({
  user,
  pending,
  onSave,
}: {
  user: AdminUserRecord;
  pending: boolean;
  onSave: (patch: {
    display_name?: string | null;
    wechat_id?: string | null;
    wechat_openid?: string | null;
    wechat_unionid?: string | null;
    city?: string | null;
    admin_notes?: string | null;
  }) => void;
}) {
  const [form, setForm] = useState({
    display_name: user.display_name ?? "",
    wechat_id: user.wechat_id ?? "",
    wechat_openid: user.wechat_openid ?? "",
    wechat_unionid: user.wechat_unionid ?? "",
    city: user.city ?? "",
    admin_notes: user.admin_notes ?? "",
  });

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-label-md text-on-surface">账号信息（可编辑，写入 Supabase）</h3>
          <p className="font-label-sm mt-1 text-text-soft">
            用户 ID：<span className="font-mono">{user.id}</span>
          </p>
          <p className="font-label-sm text-text-soft">
            登录邮箱：<span className="font-mono">{user.email || "—"}</span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            label="用户名称"
            value={form.display_name}
            onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
          />
          <FieldInput
            label="微信号"
            value={form.wechat_id}
            onChange={(v) => setForm((f) => ({ ...f, wechat_id: v }))}
          />
          <FieldInput
            label="微信 OpenID"
            value={form.wechat_openid}
            onChange={(v) => setForm((f) => ({ ...f, wechat_openid: v }))}
            mono
          />
          <FieldInput
            label="微信 UnionID"
            value={form.wechat_unionid}
            onChange={(v) => setForm((f) => ({ ...f, wechat_unionid: v }))}
            mono
          />
          <FieldInput
            label="城市"
            value={form.city}
            onChange={(v) => setForm((f) => ({ ...f, city: v }))}
          />
          <div className="sm:col-span-2">
            <FieldInput
              label="运营备注"
              value={form.admin_notes}
              onChange={(v) => setForm((f) => ({ ...f, admin_notes: v }))}
              multiline
            />
          </div>
        </div>
        <div className="font-label-sm text-text-soft">
          坐标：{formatCoord(user.latitude)}, {formatCoord(user.longitude)} · 注册{" "}
          {formatDateTime(user.created_at)}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(form)}
          className="font-label-md inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-on-primary disabled:opacity-60"
        >
          <MaterialIcon name="save" className="text-[18px]" />
          保存到 Supabase
        </button>
      </section>

      <BabyProfileSection user={user} />
    </div>
    <UserDressingRecords userId={user.id} isAppUser />
    </>
  );
}

function ManualUserEditor({
  user,
  pending,
  onSave,
  onDelete,
}: {
  user: AdminUserRecord;
  pending: boolean;
  onSave: (form: typeof emptyManualForm) => void;
  onDelete: () => void;
}) {
  const baby = user.babies[0];
  const [form, setForm] = useState({
    parent_name: user.display_name ?? "",
    wechat_id: user.wechat_id ?? "",
    email: user.email ?? "",
    city: user.city ?? "",
    admin_notes: user.admin_notes ?? "",
    baby_name: baby?.name ?? "",
    baby_birth_date: baby?.birth_date ?? "",
    baby_gender: baby?.gender ?? "unknown",
    baby_height_cm: baby?.height_cm != null ? String(baby.height_cm) : "",
    baby_weight_kg: baby?.weight_kg != null ? String(baby.weight_kg) : "",
    baby_warmth_preference: baby?.warmth_preference ?? "neutral",
  });

  return (
    <ManualUserForm
      title="手动录入记录"
      form={form}
      onChange={setForm}
      onSubmit={() => onSave(form)}
      onDelete={onDelete}
      pending={pending}
    />
  );
}

function ManualUserForm({
  title,
  form,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
  pending,
}: {
  title: string;
  form: typeof emptyManualForm;
  onChange: (form: typeof emptyManualForm) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-sm">
      <h2 className="font-headline-md mb-4">{title}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid gap-3 sm:grid-cols-2">
          <h3 className="font-label-md sm:col-span-2 text-on-surface">用户信息</h3>
          <FieldInput
            label="用户名称 *"
            value={form.parent_name}
            onChange={(v) => onChange({ ...form, parent_name: v })}
          />
          <FieldInput
            label="微信号"
            value={form.wechat_id}
            onChange={(v) => onChange({ ...form, wechat_id: v })}
          />
          <FieldInput
            label="邮箱"
            value={form.email}
            onChange={(v) => onChange({ ...form, email: v })}
          />
          <FieldInput
            label="城市"
            value={form.city}
            onChange={(v) => onChange({ ...form, city: v })}
          />
          <div className="sm:col-span-2">
            <FieldInput
              label="运营备注"
              value={form.admin_notes}
              onChange={(v) => onChange({ ...form, admin_notes: v })}
              multiline
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <h3 className="font-label-md sm:col-span-2 text-on-surface">宝宝档案</h3>
          <FieldInput
            label="宝宝姓名"
            value={form.baby_name}
            onChange={(v) => onChange({ ...form, baby_name: v })}
          />
          <FieldInput
            label="生日"
            type="date"
            value={form.baby_birth_date}
            onChange={(v) => onChange({ ...form, baby_birth_date: v })}
          />
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-text-soft">性别</span>
            <select
              value={form.baby_gender}
              onChange={(e) => onChange({ ...form, baby_gender: e.target.value })}
              className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            >
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-sm text-text-soft">冷暖偏好</span>
            <select
              value={form.baby_warmth_preference}
              onChange={(e) => onChange({ ...form, baby_warmth_preference: e.target.value })}
              className="font-body-md rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            >
              {WARMTH_PREFERENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <FieldInput
            label="身高 (cm)"
            value={form.baby_height_cm}
            onChange={(v) => onChange({ ...form, baby_height_cm: v })}
            inputMode="decimal"
          />
          <FieldInput
            label="体重 (kg)"
            value={form.baby_weight_kg}
            onChange={(v) => onChange({ ...form, baby_weight_kg: v })}
            inputMode="decimal"
          />
        </section>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onSubmit}
          className="font-label-md inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-on-primary disabled:opacity-60"
        >
          <MaterialIcon name="save" className="text-[18px]" />
          保存到 Supabase
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="font-label-md inline-flex min-h-10 items-center rounded-lg border border-outline-variant px-4 text-on-surface-variant"
          >
            取消
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="font-label-md inline-flex min-h-10 items-center gap-2 rounded-lg border border-error/40 px-4 text-error disabled:opacity-60"
          >
            <MaterialIcon name="delete" className="text-[18px]" />
            删除记录
          </button>
        )}
      </div>
    </div>
  );
}

function BabyProfileSection({ user }: { user: AdminUserRecord }) {
  return (
    <section>
      <h3 className="font-label-md mb-3 text-on-surface">
        宝宝档案（C 端真实数据，只读）
        {user.babies.length > 0 ? ` · ${user.babies.length} 个` : ""}
      </h3>
      {user.babies.length === 0 ? (
        <p className="font-body-md text-text-soft">该用户尚未在 C 端创建宝宝档案。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {user.babies.map((baby) => (
            <div
              key={baby.id}
              className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-label-md text-on-surface">{baby.name}</p>
                {baby.is_active && (
                  <span className="font-label-sm rounded bg-primary/10 px-2 py-0.5 text-primary">
                    当前选中
                  </span>
                )}
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <DetailItem label="生日" value={baby.birth_date} />
                <DetailItem label="性别" value={genderLabel(baby.gender)} />
                <DetailItem label="活动量" value={activityLabel(baby.activity_level)} />
                <DetailItem
                  label="身高"
                  value={baby.height_cm != null ? `${baby.height_cm} cm` : null}
                />
                <DetailItem
                  label="体重"
                  value={baby.weight_kg != null ? `${baby.weight_kg} kg` : null}
                />
                <DetailItem
                  label="冷暖偏好"
                  value={warmthPreferenceLabel(baby.warmth_preference)}
                />
                <DetailItem label="备注" value={baby.notes} className="sm:col-span-2" />
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  mono,
  multiline,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  multiline?: boolean;
  type?: string;
  inputMode?: "decimal" | "text";
}) {
  const className = `font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface outline-none focus:border-primary ${mono ? "font-mono text-sm" : ""}`;

  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-sm text-text-soft">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
        />
      )}
    </label>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-label-sm text-text-soft">{label}</dt>
      <dd className="font-body-md mt-0.5 text-on-surface">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function formatBabySummary(baby: AdminUserRecord["babies"][number] | undefined): string {
  if (!baby) return "";
  const parts = [baby.birth_date, genderLabel(baby.gender)].filter((p) => p && p !== "—");
  return parts.join(" · ");
}
