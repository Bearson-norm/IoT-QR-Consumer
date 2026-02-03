-- PostgreSQL Setup Script
-- Jalankan script ini sebagai superuser (biasanya postgres)
-- 
-- Usage:
--   psql -U postgres -f scripts/setup-postgresql.sql
--   atau
--   psql -U postgres
--   lalu copy-paste isi file ini

-- Buat database
CREATE DATABASE iot_qr_consumer;

-- Buat user admin (jika belum ada)
-- Jika user sudah ada, akan error tapi tidak masalah
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'admin') THEN
        CREATE USER admin WITH PASSWORD 'admin123';
    END IF;
END
$$;

-- Grant privileges untuk database
GRANT ALL PRIVILEGES ON DATABASE iot_qr_consumer TO admin;

-- Connect ke database yang baru dibuat
\c iot_qr_consumer

-- Grant privileges untuk schema
GRANT ALL ON SCHEMA public TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;

-- Selesai
\q
