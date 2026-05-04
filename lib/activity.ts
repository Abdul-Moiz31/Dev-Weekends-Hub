import { createClient } from '@/lib/supabase/client';

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    metadata,
  });
}
