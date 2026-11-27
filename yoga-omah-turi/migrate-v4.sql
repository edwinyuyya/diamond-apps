-- v4: nominal donasi sukarela yang diterima (untuk total pendapatan di Telegram)
alter table registrations add column if not exists received_amount int check (received_amount is null or received_amount >= 0);
