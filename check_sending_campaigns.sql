SELECT id, name, status, inclusion_tags, exclusion_tags, total_target, clinic_id, template_name
FROM campaigns 
WHERE status = 'sending';
