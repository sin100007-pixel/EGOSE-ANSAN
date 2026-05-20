-- 필름시뮬레이터 1단계 DB 구조
-- Supabase SQL Editor에서 그대로 실행하세요.
-- 기존 products / User 자료는 삭제하지 않습니다.

create extension if not exists pgcrypto;

-- 1) 기존 필름봇 products 테이블에 시뮬레이터 노출 여부만 추가
alter table if exists products
  add column if not exists is_simulatable boolean not null default true;

create index if not exists idx_products_is_simulatable
  on products (is_simulatable);

-- 2) 시뮬레이션 공간 10개를 관리할 테이블
create table if not exists simulator_spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  thumbnail_url text,
  base_image_url text,
  overlay_image_url text,
  mask_config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_simulator_spaces_active_sort
  on simulator_spaces (is_active, sort_order, created_at);

-- 3) 시공자가 고객에게 보내는 7일 제한 링크
create table if not exists simulator_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  installer_id text references "User"(id) on delete set null,
  installer_name text,
  customer_name text,
  memo text,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_simulator_links_token
  on simulator_links (token);

create index if not exists idx_simulator_links_installer_created
  on simulator_links (installer_id, created_at desc);

create index if not exists idx_simulator_links_active_expires
  on simulator_links (is_active, expires_at);

-- 4) 링크별 허용 공간
-- 이 테이블에 아무 행도 없으면 해당 링크는 활성 공간 전체를 허용하는 방식으로 앱에서 처리합니다.
create table if not exists simulator_link_spaces (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references simulator_links(id) on delete cascade,
  space_id uuid not null references simulator_spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (link_id, space_id)
);

create index if not exists idx_simulator_link_spaces_link
  on simulator_link_spaces (link_id);

-- 5) 링크별 허용 필름
-- 이 테이블에 아무 행도 없으면 해당 링크는 is_simulatable=true 필름 전체를 허용하는 방식으로 앱에서 처리합니다.
create table if not exists simulator_link_films (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references simulator_links(id) on delete cascade,
  product_id bigint not null,
  created_at timestamptz not null default now(),
  unique (link_id, product_id)
);

create index if not exists idx_simulator_link_films_link
  on simulator_link_films (link_id);

create index if not exists idx_simulator_link_films_product
  on simulator_link_films (product_id);

-- updated_at 공통 트리거
create or replace function set_simulator_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_simulator_spaces_updated_at on simulator_spaces;
create trigger trg_simulator_spaces_updated_at
before update on simulator_spaces
for each row execute procedure set_simulator_updated_at();

drop trigger if exists trg_simulator_links_updated_at on simulator_links;
create trigger trg_simulator_links_updated_at
before update on simulator_links
for each row execute procedure set_simulator_updated_at();

-- 1단계 테스트용 공간 1개
-- 실제 이미지가 준비되면 base_image_url / overlay_image_url / thumbnail_url을 업데이트하면 됩니다.
insert into simulator_spaces (name, description, sort_order, is_active)
select '테스트 공간', '1단계 연결 확인용 공간입니다. 실제 공간 이미지는 나중에 등록합니다.', 1, true
where not exists (
  select 1 from simulator_spaces where name = '테스트 공간'
);

-- 6) 시뮬레이터 필름 검색/팔레트/썸네일 안정화용 products 컬럼
-- 이미 있는 DB에서는 값만 유지하고 컬럼이 없을 때만 추가합니다.
alter table if exists products
  add column if not exists simulation_image_path text,
  add column if not exists simulation_thumb_path text,
  add column if not exists palette_main text,
  add column if not exists palette_sub text,
  add column if not exists palette_color text;

create index if not exists idx_products_simulator_palette_main
  on products (palette_main);

create index if not exists idx_products_simulator_palette_sub
  on products (palette_sub);

create index if not exists idx_products_simulator_palette_color
  on products (palette_color);
