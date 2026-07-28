-- AirisLens target final DDL for escrow-based marketplace architecture
-- Note:
-- 1. This file describes the target schema after finance cutover is complete.
-- 2. Runtime-safe additive migration is provided separately in
--    database/migrations/2026-06-25_03_add_finance_foundation.sql.

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','admin','user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `email_verified_at` datetime DEFAULT NULL,
  `verification_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `superadmin_slot` tinyint GENERATED ALWAYS AS ((case when (`role` = _utf8mb4'superadmin') then 1 else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_verification_token_unique` (`verification_token`),
  UNIQUE KEY `users_superadmin_singleton` (`superadmin_slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_profiles` (
  `user_id` bigint unsigned NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `specializations_json` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `whatsapp` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `free_distance_km` decimal(8,2) NOT NULL DEFAULT '5.00',
  `flat_transport_fee` int unsigned NOT NULL DEFAULT '0',
  `transport_fee_per_km` bigint unsigned NOT NULL DEFAULT '3000',
  `partner_type` enum('individual','studio') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'individual',
  `team_quota` int unsigned NOT NULL DEFAULT '1',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '10.00',
  `instagram` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `tiktok` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `facebook` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `website` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `profile_photo_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `partner_profiles_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partner_categories_user_slug_unique` (`user_id`,`slug`),
  KEY `partner_categories_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_packages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` bigint unsigned NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `partner_packages_user_id_idx` (`user_id`),
  KEY `partner_packages_category_id_idx` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_gallery_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `partner_gallery_items_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `schedule_date` date NOT NULL,
  `schedule_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `partner_schedules_user_date_time_unique` (`user_id`,`schedule_date`,`schedule_time`),
  KEY `partner_schedules_user_id_idx` (`user_id`),
  KEY `partner_schedules_schedule_date_idx` (`schedule_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_applications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `location` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `experience` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `portfolio_link` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `about_you` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `submitted_by_user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `partner_applications_status_idx` (`status`),
  KEY `partner_applications_user_id_idx` (`submitted_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photographer_user_id` bigint unsigned NOT NULL,
  `customer_user_id` bigint unsigned DEFAULT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `package_id` bigint unsigned DEFAULT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `package_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` bigint unsigned NOT NULL,
  `booking_date` date NOT NULL,
  `booking_time` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_end_time` time DEFAULT NULL,
  `location` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_address` text COLLATE utf8mb4_unicode_ci,
  `event_latitude` decimal(10,8) DEFAULT NULL,
  `event_longitude` decimal(11,8) DEFAULT NULL,
  `distance_km` decimal(8,2) NOT NULL DEFAULT '0.00',
  `transport_fee` bigint unsigned NOT NULL DEFAULT '0',
  `package_price` bigint unsigned DEFAULT NULL,
  `service_fee_rate` decimal(5,2) NOT NULL DEFAULT '3.00',
  `service_fee` int unsigned NOT NULL DEFAULT '0',
  `total_price` bigint unsigned DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending_payment','confirmed','in_progress','awaiting_confirmation','completed','cancelled','disputed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_payment',
  `service_completed_at` timestamp NULL DEFAULT NULL,
  `customer_confirmed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancel_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bookings_order_id_unique` (`order_id`),
  KEY `bookings_photographer_user_id_idx` (`photographer_user_id`),
  KEY `bookings_customer_user_id_idx` (`customer_user_id`),
  KEY `bookings_category_id_idx` (`category_id`),
  KEY `bookings_package_id_idx` (`package_id`),
  KEY `bookings_booking_date_idx` (`booking_date`),
  KEY `bookings_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `order_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'midtrans',
  `gateway_transaction_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gross_amount` bigint unsigned NOT NULL,
  `currency` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IDR',
  `payment_method` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('created','pending','paid','failed','expired','cancelled','refunded','partial_refunded','chargeback') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `gateway_status_raw` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refunded_amount` bigint unsigned NOT NULL DEFAULT '0',
  `payload_json` longtext COLLATE utf8mb4_unicode_ci,
  `paid_at` timestamp NULL DEFAULT NULL,
  `expired_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_booking_id_unique` (`booking_id`),
  UNIQUE KEY `payments_order_id_unique` (`order_id`),
  KEY `payments_gateway_transaction_id_idx` (`gateway_transaction_id`),
  KEY `payments_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `payment_id` bigint unsigned NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway_status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_valid` tinyint(1) NOT NULL DEFAULT '1',
  `payload_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_events_payment_id_idx` (`payment_id`),
  KEY `payment_events_event_type_idx` (`event_type`),
  KEY `payment_events_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `partner_wallets` (
  `user_id` bigint unsigned NOT NULL,
  `available_balance` bigint unsigned NOT NULL DEFAULT '0',
  `pending_withdrawal_balance` bigint unsigned NOT NULL DEFAULT '0',
  `total_earned` bigint unsigned NOT NULL DEFAULT '0',
  `total_withdrawn` bigint unsigned NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `withdrawal_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `partner_user_id` bigint unsigned NOT NULL,
  `requested_amount` bigint unsigned NOT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','approved','processing','paid','rejected','failed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `reviewed_by_user_id` bigint unsigned DEFAULT NULL,
  `transfer_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `withdrawal_requests_partner_user_id_idx` (`partner_user_id`),
  KEY `withdrawal_requests_reviewed_by_user_id_idx` (`reviewed_by_user_id`),
  KEY `withdrawal_requests_status_idx` (`status`),
  KEY `withdrawal_requests_requested_at_idx` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_user_id` bigint unsigned NOT NULL,
  `booking_id` bigint unsigned DEFAULT NULL,
  `withdrawal_request_id` bigint unsigned DEFAULT NULL,
  `type` enum('escrow_release','withdrawal_hold','withdrawal_paid','withdrawal_rejected_return','refund_adjustment','manual_adjustment_credit','manual_adjustment_debit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('credit','debit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` bigint unsigned NOT NULL,
  `balance_before` bigint unsigned NOT NULL,
  `balance_after` bigint unsigned NOT NULL,
  `reference_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wallet_transactions_wallet_user_id_idx` (`wallet_user_id`),
  KEY `wallet_transactions_booking_id_idx` (`booking_id`),
  KEY `wallet_transactions_withdrawal_request_id_idx` (`withdrawal_request_id`),
  KEY `wallet_transactions_type_idx` (`type`),
  KEY `wallet_transactions_created_at_idx` (`created_at`),
  KEY `wallet_transactions_created_by_user_id_idx` (`created_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `photographer_user_id` bigint unsigned NOT NULL,
  `gross_amount` bigint unsigned NOT NULL,
  `package_price` bigint unsigned NOT NULL DEFAULT '0',
  `transport_fee` bigint unsigned NOT NULL DEFAULT '0',
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` bigint unsigned NOT NULL DEFAULT '0',
  `net_partner_amount` bigint unsigned NOT NULL DEFAULT '0',
  `status` enum('unpaid','held','ready_to_release','released','refunded','partial_refunded','on_hold_dispute') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `held_at` timestamp NULL DEFAULT NULL,
  `ready_to_release_at` timestamp NULL DEFAULT NULL,
  `released_at` timestamp NULL DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `released_wallet_transaction_id` bigint unsigned DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_settlements_booking_id_unique` (`booking_id`),
  KEY `booking_settlements_photographer_user_id_idx` (`photographer_user_id`),
  KEY `booking_settlements_status_idx` (`status`),
  KEY `booking_settlements_released_wallet_tx_idx` (`released_wallet_transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_disputes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint unsigned NOT NULL,
  `opened_by_user_id` bigint unsigned NOT NULL,
  `type` enum('complaint','refund_request','partial_refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','reviewing','resolved_refund','resolved_partial_refund','resolved_release','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `resolved_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_disputes_booking_id_idx` (`booking_id`),
  KEY `booking_disputes_opened_by_user_id_idx` (`opened_by_user_id`),
  KEY `booking_disputes_resolved_by_user_id_idx` (`resolved_by_user_id`),
  KEY `booking_disputes_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_notification_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `fcm_token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_notification_tokens_user_token_unique` (`user_id`,`fcm_token`),
  KEY `admin_notification_tokens_user_id_idx` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `partner_profiles`
  ADD CONSTRAINT `fk_partner_profiles_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `partner_categories`
  ADD CONSTRAINT `fk_partner_categories_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `partner_packages`
  ADD CONSTRAINT `fk_partner_packages_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partner_packages_category`
  FOREIGN KEY (`category_id`) REFERENCES `partner_categories` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `partner_gallery_items`
  ADD CONSTRAINT `fk_partner_gallery_items_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `partner_schedules`
  ADD CONSTRAINT `fk_partner_schedules_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `partner_applications`
  ADD CONSTRAINT `fk_partner_applications_submitted_user`
  FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_photographer_user`
  FOREIGN KEY (`photographer_user_id`) REFERENCES `users` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_customer_user`
  FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_package`
  FOREIGN KEY (`package_id`) REFERENCES `partner_packages` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_booking`
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `payment_events`
  ADD CONSTRAINT `fk_payment_events_payment`
  FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `partner_wallets`
  ADD CONSTRAINT `fk_partner_wallets_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `withdrawal_requests`
  ADD CONSTRAINT `fk_withdrawal_requests_partner_user`
  FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_withdrawal_requests_reviewed_by_user`
  FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `wallet_transactions`
  ADD CONSTRAINT `fk_wallet_transactions_wallet_user`
  FOREIGN KEY (`wallet_user_id`) REFERENCES `partner_wallets` (`user_id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_transactions_booking`
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_transactions_withdrawal_request`
  FOREIGN KEY (`withdrawal_request_id`) REFERENCES `withdrawal_requests` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallet_transactions_created_by_user`
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `booking_settlements`
  ADD CONSTRAINT `fk_booking_settlements_booking`
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_settlements_photographer_user`
  FOREIGN KEY (`photographer_user_id`) REFERENCES `users` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_settlements_released_wallet_tx`
  FOREIGN KEY (`released_wallet_transaction_id`) REFERENCES `wallet_transactions` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `booking_disputes`
  ADD CONSTRAINT `fk_booking_disputes_booking`
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_disputes_opened_by_user`
  FOREIGN KEY (`opened_by_user_id`) REFERENCES `users` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_disputes_resolved_by_user`
  FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `admin_notification_tokens`
  ADD CONSTRAINT `fk_admin_notification_tokens_user`
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
