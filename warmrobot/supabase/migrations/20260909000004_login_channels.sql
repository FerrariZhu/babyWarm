-- Track the most recent successful sign-in method for operator visibility.

alter table public.profiles
  add column if not exists last_login_channel text,
  add column if not exists last_login_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_last_login_channel_check;

alter table public.profiles
  add constraint profiles_last_login_channel_check
  check (
    last_login_channel is null
    or last_login_channel in (
      'email_password',
      'wechat_miniprogram',
      'wechat_mock',
      'xiaohongshu',
      'douyin'
    )
  );

comment on column public.profiles.last_login_channel is '最近一次成功登录渠道';
comment on column public.profiles.last_login_at is '最近一次成功登录时间';

-- Preserve a useful channel for existing WeChat-linked accounts until their next login.
update public.profiles
set last_login_channel = 'wechat_miniprogram'
where last_login_channel is null
  and wechat_openid is not null;
