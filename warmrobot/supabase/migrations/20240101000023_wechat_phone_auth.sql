-- WeChat + phone identity on profiles; extend signup trigger.

alter table public.profiles
  add column if not exists phone text;

comment on column public.profiles.phone is '绑定手机号（微信场景用户标识之一）';

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;

create unique index if not exists profiles_wechat_id_unique
  on public.profiles (wechat_id)
  where wechat_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    wechat_openid,
    wechat_unionid,
    wechat_id,
    phone
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'wechat_openid',
    new.raw_user_meta_data ->> 'wechat_unionid',
    new.raw_user_meta_data ->> 'wechat_id',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;
