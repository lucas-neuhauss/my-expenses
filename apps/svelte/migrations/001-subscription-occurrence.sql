-- Additive migration for existing databases. Do not silently delete duplicate financial records.
-- If this fails because duplicate occurrences already exist, review those records before retrying.
CREATE UNIQUE INDEX IF NOT EXISTS transaction_subscription_date_unique
	ON "transaction" (subscription_id, date);
