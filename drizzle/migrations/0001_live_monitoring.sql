ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_logout_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS hints_used integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  event_type text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all" ON public.activity_log FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.competition_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  duration_minutes integer,
  started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.competition_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.competition_settings TO authenticated;
GRANT ALL ON public.competition_settings TO service_role;
ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all" ON public.competition_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));