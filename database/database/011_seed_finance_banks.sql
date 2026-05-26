-- AutoNidhi — Migration 011: Add real finance bank seed data to master_bank
-- These are real Indian banks/NBFCs used for vehicle loans

INSERT INTO master_bank (bank_name, area, contact_no) VALUES
  ('HDFC Bank',                     'Pan India',           '1800-202-6161'),
  ('ICICI Bank',                    'Pan India',           '1800-200-3344'),
  ('State Bank of India (SBI)',     'Pan India',           '1800-425-3800'),
  ('Axis Bank',                     'Pan India',           '1800-419-5959'),
  ('Kotak Mahindra Bank',           'Pan India',           '1800-209-0000'),
  ('IDFC FIRST Bank',               'Pan India',           '1800-419-4332'),
  ('Bajaj Finance Limited',         'Pan India',           '1800-103-4151'),
  ('Mahindra Finance',              'Pan India',           '1800-233-1234'),
  ('Shriram Finance',               'Pan India',           '1800-103-6369'),
  ('L&T Finance',                   'Pan India',           '1800-209-4747'),
  ('Tata Capital Financial Srvcs',  'Pan India',           '1860-267-6060'),
  ('HDB Financial Services',        'Pan India',           '1800-103-1032'),
  ('Muthoot Capital Services',      'Kerala / South India','0484-6690000')
ON CONFLICT DO NOTHING;
