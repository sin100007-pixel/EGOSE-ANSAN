-- 선택 실행 SQL입니다.
-- 코드 패치만으로도 public/simulator, simulator, /simulator 형식은 보정됩니다.
-- 그래도 DB 값을 깔끔하게 정리하고 싶을 때 Supabase SQL Editor에서 실행하세요.

create or replace function public.egose_normalize_simulator_asset_path(raw_value text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select btrim(regexp_replace(coalesce(raw_value, ''), E'\\\\[nr]|[\r\n\t]', '', 'g')) as value
  ), public_removed as (
    select value, regexp_replace(value, '^/?public/', '', 'i') as no_public
    from cleaned
  )
  select case
    when raw_value is null then null
    when value = '' then raw_value
    when value ~* '^(data:|blob:|https?://|//)' then value
    when no_public ~* '^/?simulator/' then '/' || regexp_replace(no_public, '^/+', '')
    else value
  end
  from public_removed;
$$;

update simulator_spaces
set
  thumbnail_url = public.egose_normalize_simulator_asset_path(thumbnail_url),
  base_image_url = public.egose_normalize_simulator_asset_path(base_image_url),
  overlay_image_url = public.egose_normalize_simulator_asset_path(overlay_image_url);

with normalized_zones as (
  select
    s.id,
    jsonb_agg(
      case
        when zone ? 'mask_url' then
          jsonb_set(
            zone,
            '{mask_url}',
            to_jsonb(public.egose_normalize_simulator_asset_path(zone ->> 'mask_url')),
            true
          )
        else zone
      end
      order by ordinality
    ) as zones
  from simulator_spaces s
  cross join lateral jsonb_array_elements(s.mask_config -> 'zones') with ordinality as z(zone, ordinality)
  where jsonb_typeof(s.mask_config -> 'zones') = 'array'
  group by s.id
)
update simulator_spaces s
set mask_config = jsonb_set(s.mask_config, '{zones}', normalized_zones.zones, true)
from normalized_zones
where s.id = normalized_zones.id;
