-- Use a cap glyph for hat cards (apparel reads as T-shirt in Material Symbols).
update public.categories
set icon_key = 'sports_baseball', updated_at = now()
where code = 'hat';
