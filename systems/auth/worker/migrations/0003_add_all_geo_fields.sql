-- Add remaining better-auth-cloudflare geolocation fields to sessions
ALTER TABLE `sessions` ADD COLUMN `city`        text;
ALTER TABLE `sessions` ADD COLUMN `country`     text;
ALTER TABLE `sessions` ADD COLUMN `region`      text;
ALTER TABLE `sessions` ADD COLUMN `region_code` text;
ALTER TABLE `sessions` ADD COLUMN `colo`        text;
