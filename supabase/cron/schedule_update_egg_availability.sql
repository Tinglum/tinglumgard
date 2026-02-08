-- Schedule update-egg-availability Edge Function (run in Supabase SQL editor)
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> before running.
-- Example schedule: daily at 03:00 UTC

-- Option A: Using supabase_functions.http_request (recommended if available)
select cron.schedule(
	'update-egg-availability',
	'0 3 * * *',
	$$
	select
		supabase_functions.http_request(
			'https://<PROJECT_REF>.functions.supabase.co/update-egg-availability',
			'POST',
			'{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}',
			'{}'::jsonb
		);
	$$
);

-- Option B: Using net.http_post (if pg_net is enabled)
-- select cron.schedule(
--   'update-egg-availability',
--   '0 3 * * *',
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.functions.supabase.co/update-egg-availability',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- To remove the schedule later:
-- select cron.unschedule('update-egg-availability');
