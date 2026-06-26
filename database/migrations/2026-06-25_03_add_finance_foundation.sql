-- AirisLens finance foundation migration
-- Safe additive phase for escrow architecture.
-- This migration intentionally DOES NOT cut over bookings.status enum yet,
-- because current runtime code still expects the legacy values:
-- pending, confirmed, completed, cancelled.
--
-- The booking/payment webhook refactor should be completed first, then a
-- dedicated cutover migration can update bookings.status to the final business
-- statuses:
-- pending_payment, confirmed, in_progress, awaiting_confirmation,
-- completed, cancelled, disputed, refunded.

ALTER TABLE `partner_profiles`
  ADD COLUMN IF NOT EXISTS `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00
  AFTER `team_quota`;

ALTER TABLE `bookings`
  ADD COLUMN IF NOT EXISTS `service_completed_at` TIMESTAMP NULL DEFAULT NULL
  AFTER `status`,
  ADD COLUMN IF NOT EXISTS `customer_confirmed_at` TIMESTAMP NULL DEFAULT NULL
  AFTER `service_completed_at`,
  ADD COLUMN IF NOT EXISTS `cancelled_at` TIMESTAMP NULL DEFAULT NULL
  AFTER `customer_confirmed_at`,
  ADD COLUMN IF NOT EXISTS `cancel_reason` TEXT NULL
  AFTER `cancelled_at`;

CREATE TABLE IF NOT EXISTS `payments` (
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
  `payload_json` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `expired_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_booking_id_unique` (`booking_id`),
  UNIQUE KEY `payments_order_id_unique` (`order_id`),
  KEY `payments_gateway_transaction_id_idx` (`gateway_transaction_id`),
  KEY `payments_status_idx` (`status`),
  CONSTRAINT `fk_payments_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_events` (
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
  KEY `payment_events_created_at_idx` (`created_at`),
  CONSTRAINT `fk_payment_events_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_wallets` (
  `user_id` bigint unsigned NOT NULL,
  `available_balance` bigint unsigned NOT NULL DEFAULT '0',
  `pending_withdrawal_balance` bigint unsigned NOT NULL DEFAULT '0',
  `total_earned` bigint unsigned NOT NULL DEFAULT '0',
  `total_withdrawn` bigint unsigned NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_partner_wallets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
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
  KEY `withdrawal_requests_requested_at_idx` (`requested_at`),
  CONSTRAINT `fk_withdrawal_requests_partner_user`
    FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_withdrawal_requests_reviewed_by_user`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
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
  KEY `wallet_transactions_created_by_user_id_idx` (`created_by_user_id`),
  CONSTRAINT `fk_wallet_transactions_wallet_user`
    FOREIGN KEY (`wallet_user_id`) REFERENCES `partner_wallets` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_wallet_transactions_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_wallet_transactions_withdrawal_request`
    FOREIGN KEY (`withdrawal_request_id`) REFERENCES `withdrawal_requests` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_wallet_transactions_created_by_user`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_settlements` (
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
  KEY `booking_settlements_released_wallet_tx_idx` (`released_wallet_transaction_id`),
  CONSTRAINT `fk_booking_settlements_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_settlements_photographer_user`
    FOREIGN KEY (`photographer_user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_settlements_released_wallet_tx`
    FOREIGN KEY (`released_wallet_transaction_id`) REFERENCES `wallet_transactions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `booking_disputes` (
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
  KEY `booking_disputes_status_idx` (`status`),
  CONSTRAINT `fk_booking_disputes_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_disputes_opened_by_user`
    FOREIGN KEY (`opened_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_booking_disputes_resolved_by_user`
    FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
