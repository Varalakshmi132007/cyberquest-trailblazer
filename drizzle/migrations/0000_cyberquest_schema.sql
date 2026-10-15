create extension if not exists pgcrypto with schema extensions;
create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id,role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.claim_first_admin() returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists(select 1 from public.user_roles where role='admin') then return public.has_role(auth.uid(),'admin'); end if;
  insert into public.user_roles(user_id,role) values (auth.uid(),'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon, public; grant execute on function public.claim_first_admin() to authenticated;

create table public.challenges (id uuid primary key default gen_random_uuid(), level int not null unique, title text not null, category text not null, description text not null, puzzle text not null, answer_hash text not null, hint text not null, points int not null default 100, hint_penalty int not null default 25, active boolean not null default true, created_at timestamptz not null default now());
create table public.participants (id uuid primary key default gen_random_uuid(), display_name text not null, token_hash text not null unique, score int not null default 0, current_level int not null default 1, completed_at timestamptz, created_at timestamptz not null default now());
create unique index participants_name_ci on public.participants (lower(display_name));
create table public.solves (participant_id uuid not null references public.participants(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade, points int not null, solved_at timestamptz not null default now(), primary key(participant_id,challenge_id));
create table public.hint_usage (participant_id uuid not null references public.participants(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade, used_at timestamptz not null default now(), primary key(participant_id,challenge_id));
create table public.submissions (id uuid primary key default gen_random_uuid(), participant_id uuid not null references public.participants(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade, correct boolean not null, created_at timestamptz not null default now());
create index on public.submissions(participant_id, created_at);
do $$ declare t text; begin foreach t in array array['challenges','participants','solves','hint_usage','submissions'] loop
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "admin all" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
end loop; end $$;

insert into public.challenges(level,title,category,description,puzzle,answer_hash,hint,points) values
(1,'The Rotated Message','Cryptography','An intercepted note was scrambled with a classic substitution cipher that shifts every letter 13 places. Decode it.','GERNFHER',encode(extensions.digest('treasure','sha256'),'hex'),'ROT13: A↔N, B↔O, C↔P … apply it to each letter.',100),
(2,'Encoded Transmission','Encoding','This string looks random, but it is just encoding — not encryption. The trailing "=" is a clue.','ZmlyZXdhbGw=',encode(extensions.digest('firewall','sha256'),'hex'),'Base64 uses A–Z, a–z, 0–9, + and /, padded with =.',150),
(3,'Spot the Phish','Phishing Awareness','Three emails claim to be from PayPal. Which sender domain is fake? Enter the domain exactly.','1) service@paypal.com\n2) security@paypa1.com\n3) noreply@paypal.com',encode(extensions.digest('paypa1.com','sha256'),'hex'),'Look very closely at every character — numbers can impersonate letters.',150),
(4,'Weak Hash','Password Security','A leaked database stored this unsalted MD5 password hash. It is one of the most common passwords in the world. What is it?','5f4dcc3b5aa765d61d8327deb882cf99',encode(extensions.digest('password','sha256'),'hex'),'Unsalted hashes of common passwords are in public rainbow tables. Think of the laziest password possible.',200),
(5,'The Final Vault','Binary','The vault opens with a word written in 8‑bit ASCII binary.','01101011 01100101 01111001',encode(extensions.digest('key','sha256'),'hex'),'Convert each byte to decimal, then to an ASCII letter (97 = a).',250);