-- Material Symbols has no "socks" ligature (renders as text). Use footprint for the socks slot.
update public.categories
set icon_key = 'footprint', updated_at = now()
where code = 'socks';
