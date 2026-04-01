SELECT get_estimated_audience(
    (SELECT clinic_id FROM patients LIMIT 1),
    ARRAY['INTERÉS MICROBLADING', 'PRIMERA VEZ', 'CONSULTA PRECIO'],
    NULL
);
