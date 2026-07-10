-- Bank holidays for England and Wales: 2025 & 2026
-- Source: gov.uk

insert into bank_holidays (date, name, country) values
  -- 2025
  ('2025-01-01', 'New Year''s Day', 'england-wales'),
  ('2025-04-18', 'Good Friday', 'england-wales'),
  ('2025-04-21', 'Easter Monday', 'england-wales'),
  ('2025-05-05', 'Early May bank holiday', 'england-wales'),
  ('2025-05-26', 'Spring bank holiday', 'england-wales'),
  ('2025-08-25', 'Summer bank holiday', 'england-wales'),
  ('2025-12-25', 'Christmas Day', 'england-wales'),
  ('2025-12-26', 'Boxing Day', 'england-wales'),
  -- 2026
  ('2026-01-01', 'New Year''s Day', 'england-wales'),
  ('2026-04-03', 'Good Friday', 'england-wales'),
  ('2026-04-06', 'Easter Monday', 'england-wales'),
  ('2026-05-04', 'Early May bank holiday', 'england-wales'),
  ('2026-05-25', 'Spring bank holiday', 'england-wales'),
  ('2026-08-31', 'Summer bank holiday', 'england-wales'),
  ('2026-12-25', 'Christmas Day', 'england-wales'),
  ('2026-12-28', 'Boxing Day (substitute)', 'england-wales')
on conflict (date) do nothing;
