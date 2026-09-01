-- Baby diaper status + in-advice confirmation prompt tracking

alter table public.babies
  add column if not exists wears_diaper boolean,
  add column if not exists diaper_prompt_last_shown_at timestamptz,
  add column if not exists diaper_prompt_last_answered_at timestamptz,
  add column if not exists diaper_prompt_last_answer text
    check (diaper_prompt_last_answer in ('yes', 'no'));

comment on column public.babies.wears_diaper is
  '是否仍穿尿布：true=仍穿，false=已戒，null=未填写';
comment on column public.babies.diaper_prompt_last_shown_at is
  '穿搭建议内尿布确认选项上次展示时间（用于每日一次 / 每月一次频率）';
comment on column public.babies.diaper_prompt_last_answered_at is
  '用户上次在穿搭建议中回答尿布确认的时间';
comment on column public.babies.diaper_prompt_last_answer is
  '穿搭建议内尿布确认上次回答：yes=仍穿，no=已戒';
