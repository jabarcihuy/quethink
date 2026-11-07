-- Commit this migration before functions/constraints use the new enum value.
alter type public.app_role add value if not exists 'TEACHER';
