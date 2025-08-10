-- Create a table for public user profiles
create table users (
  id uuid not null references auth.users on delete cascade,
  "uid" text, -- For potential legacy compatibility, can be removed if not needed
  "displayName" text,
  "photoURL" text,
  "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updatedAt" timestamp with time zone,
  primary key (id)
);

-- Set up Row Level Security (RLS)
alter table users enable row level security;

create policy "Public profiles are viewable by everyone." on users
  for select using (true);

create policy "Users can insert their own profile." on users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on users
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile for new users.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, "uid")
  values (new.id, new.id::text);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Activities Table
create table activities (
    id bigserial primary key,
    title text not null,
    description text,
    category text,
    "coverImageUrl" text,
    "userId" uuid references public.users(id) on delete set null,
    status text default 'pending',
    participants jsonb default '[]'::jsonb,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone
);
alter table activities enable row level security;
create policy "Authenticated users can view approved activities." on activities for select to authenticated using (status = 'approved');
create policy "Users can create activities." on activities for insert to authenticated with check (auth.uid() = "userId");
create policy "Admin can update activity status." on activities for update using (true); -- Simplified for now
create policy "Admin can delete activities." on activities for delete using (true); -- Simplified for now


-- Check-ins Table
create table "checkIns" (
    id bigserial primary key,
    "userId" uuid not null references public.users(id) on delete cascade,
    content text,
    "isPublic" boolean default false,
    "photoUrl" text,
    "likedBy" jsonb default '[]'::jsonb,
    "commentsCount" integer default 0,
    "activityId" bigint references public.activities(id) on delete set null,
    "activityTitle" text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updatedAt" timestamp with time zone
);
alter table "checkIns" enable row level security;
create policy "Public check-ins are viewable by everyone." on "checkIns" for select using ("isPublic" = true);
create policy "Users can view their own check-ins." on "checkIns" for select using (auth.uid() = "userId");
create policy "Users can insert their own check-ins." on "checkIns" for insert with check (auth.uid() = "userId");
create policy "Users can update their own check-ins." on "checkIns" for update using (auth.uid() = "userId");
create policy "Users can delete their own check-ins." on "checkIns" for delete using (auth.uid() = "userId");


-- Comments Table
create table comments (
    id bigserial primary key,
    "checkInId" bigint not null references public."checkIns"(id) on delete cascade,
    "userId" uuid not null references public.users(id) on delete cascade,
    content text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table comments enable row level security;
create policy "Comments are viewable by everyone." on comments for select using (true); -- Simplified for now
create policy "Users can insert comments." on comments for insert to authenticated with check (auth.uid() = "userId");
create policy "Users can delete their own comments." on comments for delete using (auth.uid() = "userId");


-- Messages Table
create table messages (
    id bigserial primary key,
    "userId" uuid not null references public.users(id) on delete cascade,
    role text,
    content text,
    data jsonb,
    status text,
    "timestamp" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table messages enable row level security;
create policy "Users can view their own messages." on messages for select using (auth.uid() = "userId");
create policy "Users can insert their own messages." on messages for insert with check (auth.uid() = "userId");
create policy "Users can delete their own messages." on messages for delete using (auth.uid() = "userId");


-- Reports Table
create table reports (
    id bigserial primary key,
    "checkInId" bigint not null references public."checkIns"(id) on delete cascade,
    "reportedByUserId" uuid not null references public.users(id) on delete cascade,
    status text default 'pending',
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table reports enable row level security;
create policy "Admin can view reports." on reports for select using (true); -- Simplified
create policy "Users can create reports." on reports for insert to authenticated with check (auth.uid() = "reportedByUserId");


-- Monthly Reports Table
create table "monthly_reports" (
    id bigserial primary key,
    "userId" uuid not null references public.users(id) on delete cascade,
    year integer,
    month integer,
    summary jsonb,
    "wordCloud" jsonb,
    "emotionData" jsonb,
    "checkInCount" integer,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table "monthly_reports" enable row level security;
create policy "Users can view their own monthly reports." on "monthly_reports" for select using (auth.uid() = "userId");
create policy "System can insert monthly reports." on "monthly_reports" for insert with check (true); -- To be handled by a service role key


-- Storage Buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('checkIns', 'checkIns', true);
insert into storage.buckets (id, name, public) values ('activities', 'activities', true);

create policy "Avatar images are publicly accessible." on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Anyone can upload an avatar." on storage.objects for insert with check ( bucket_id = 'avatars' );
create policy "Anyone can update their own avatar." on storage.objects for update with check ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

create policy "Check-in images are publicly accessible." on storage.objects for select using ( bucket_id = 'checkIns' );
create policy "Anyone can upload a check-in image." on storage.objects for insert with check ( bucket_id = 'checkIns' );
create policy "Anyone can update their own check-in image." on storage.objects for update with check ( bucket_id = 'checkIns' AND auth.uid() = (storage.foldername(name))[1]::uuid );

create policy "Activity images are publicly accessible." on storage.objects for select using ( bucket_id = 'activities' );
create policy "Anyone can upload an activity image." on storage.objects for insert with check ( bucket_id = 'activities' );
create policy "Anyone can update their own activity image." on storage.objects for update with check ( bucket_id = 'activities' AND auth.uid() = (storage.foldername(name))[1]::uuid );

-- Function to increment comments count
create function increment_comments_count(checkin_id bigint)
returns void as $$
  update "checkIns"
  set "commentsCount" = "commentsCount" + 1
  where id = checkin_id;
$$ language sql volatile;
