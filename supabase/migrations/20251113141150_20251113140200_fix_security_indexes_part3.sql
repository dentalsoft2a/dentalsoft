/*
  # Correction sécurité - Partie 3: Index manquants (Tables R-Z)
*/

-- referral_rewards
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral_id ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON referral_rewards(user_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON referrals(referee_id);

-- resource_batch_link
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_material_id ON resource_batch_link(material_id);
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_user_id ON resource_batch_link(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_resource_id ON resource_batch_link(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_batch_link_variant_id ON resource_batch_link(variant_id);

-- support_messages
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON task_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee_id ON task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_delivery_note_id ON task_assignments(delivery_note_id);

-- threeshape_dentist_mapping
CREATE INDEX IF NOT EXISTS idx_threeshape_dentist_mapping_local_dentist_id ON threeshape_dentist_mapping(local_dentist_id);
CREATE INDEX IF NOT EXISTS idx_threeshape_dentist_mapping_user_id ON threeshape_dentist_mapping(user_id);

-- threeshape_sync_log
CREATE INDEX IF NOT EXISTS idx_threeshape_sync_log_user_id ON threeshape_sync_log(user_id);

-- work_assignments
CREATE INDEX IF NOT EXISTS idx_work_assignments_assigned_by ON work_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_work_assignments_employee_id ON work_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_delivery_note_id ON work_assignments(delivery_note_id);

-- work_comments
CREATE INDEX IF NOT EXISTS idx_work_comments_user_id ON work_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_delivery_note_id ON work_comments(delivery_note_id);
