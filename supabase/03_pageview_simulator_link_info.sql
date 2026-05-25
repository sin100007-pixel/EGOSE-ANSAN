-- /admin/dashboard 방문 로그에 고객용 시뮬레이터 링크 정보를 표시하기 위한 컬럼입니다.
-- Supabase SQL Editor에서 한 번 실행하면 됩니다.
alter table "PageView"
  add column if not exists "simulatorToken" text,
  add column if not exists "simulatorInstallerName" text,
  add column if not exists "simulatorCustomerName" text,
  add column if not exists "simulatorMemo" text;

create index if not exists "idx_PageView_simulatorToken"
  on "PageView" ("simulatorToken");
