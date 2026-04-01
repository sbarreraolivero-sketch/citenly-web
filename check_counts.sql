SELECT 
    (SELECT count(*) FROM patients WHERE clinic_id = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6') as patient_count,
    (SELECT count(*) FROM patient_tags WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6')) as patient_tag_mappings,
    (SELECT count(*) FROM crm_prospects WHERE clinic_id = '1ab32091-210c-4525-a7e1-e6a7dca1c8c6') as prospect_count;
