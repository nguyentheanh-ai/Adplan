-- Harden public trigger helpers without changing their trigger behavior.
-- Trigger execution still works, but direct REST/RPC calls from anon/authenticated are blocked.

alter function public.set_updated_at()
  set search_path = public;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

