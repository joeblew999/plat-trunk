-- Add better-auth-cloudflare geolocation fields to sessions
ALTER TABLE `sessions` ADD COLUMN `timezone`  text;
ALTER TABLE `sessions` ADD COLUMN `latitude`  text;
ALTER TABLE `sessions` ADD COLUMN `longitude` text;
