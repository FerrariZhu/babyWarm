-- Self-hosted analytics schema. Authorization is enforced by the application
-- server, and consumer identities live in public.app_accounts.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL CHECK (
    event_type IN ('page_view', 'module_impression', 'module_click')
  ),
  page_path text NOT NULL CHECK (page_path ~ '^/[a-z0-9_/-]*$'),
  module_name text CHECK (module_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  action_name text CHECK (action_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  visitor_id uuid NOT NULL,
  user_id uuid REFERENCES public.app_accounts(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_shape CHECK (
    (event_type = 'page_view' AND module_name IS NULL AND action_name IS NULL)
    OR (
      event_type IN ('module_impression', 'module_click')
      AND module_name IS NOT NULL
      AND action_name IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS analytics_events_event_date_idx
  ON public.analytics_events (
    occurred_at DESC,
    event_type,
    page_path,
    module_name,
    action_name
  );

CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx
  ON public.analytics_events (visitor_id, occurred_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'warmrobot_app') THEN
    GRANT INSERT ON public.analytics_events TO warmrobot_app;
    GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO warmrobot_app;
  END IF;
END
$$;
