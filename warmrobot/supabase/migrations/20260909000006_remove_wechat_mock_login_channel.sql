-- Production cleanup: mock authentication is no longer a supported login channel.

update public.profiles
set last_login_channel = null,
    last_login_at = null
where last_login_channel = 'wechat_mock';

alter table public.profiles
  drop constraint if exists profiles_last_login_channel_check;

alter table public.profiles
  add constraint profiles_last_login_channel_check
  check (
    last_login_channel is null
    or last_login_channel in (
      'email_password',
      'wechat_miniprogram',
      'xiaohongshu',
      'douyin'
    )
  );
