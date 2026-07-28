# AirisLens ERD

```mermaid
erDiagram
    USERS {
        BIGINT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR phone
        TEXT password_hash
        ENUM role
        DATETIME email_verified_at
        VARCHAR verification_token
        DATETIME verification_expires_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_PROFILES {
        BIGINT user_id PK, FK
        VARCHAR slug UK
        VARCHAR brand_name
        TEXT description
        TEXT specializations_json
        TEXT address
        VARCHAR whatsapp
        DECIMAL latitude
        DECIMAL longitude
        DECIMAL free_distance_km
        INT flat_transport_fee
        BIGINT transport_fee_per_km
        ENUM partner_type
        INT team_quota
        DECIMAL commission_rate
        VARCHAR instagram
        VARCHAR tiktok
        VARCHAR facebook
        VARCHAR website
        VARCHAR profile_photo_url
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_GALLERY_ITEMS {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR title
        VARCHAR category
        VARCHAR image_url
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_CATEGORIES {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR name
        VARCHAR slug
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_PACKAGES {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT category_id FK
        VARCHAR name
        VARCHAR duration
        BIGINT price
        TEXT description
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_SCHEDULES {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR title
        DATE schedule_date
        VARCHAR schedule_time
        VARCHAR location
        TEXT note
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_APPLICATIONS {
        BIGINT id PK
        VARCHAR location
        VARCHAR category
        VARCHAR experience
        VARCHAR portfolio_link
        TEXT about_you
        ENUM status
        BIGINT submitted_by_user_id FK
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    BOOKINGS {
        BIGINT id PK
        VARCHAR order_id UK
        BIGINT photographer_user_id FK
        BIGINT customer_user_id FK
        BIGINT category_id
        BIGINT package_id FK
        VARCHAR customer_name
        VARCHAR customer_phone
        VARCHAR package_name
        BIGINT amount
        DATE booking_date
        VARCHAR booking_time
        TIME booking_end_time
        TEXT location
        TEXT event_address
        DECIMAL event_latitude
        DECIMAL event_longitude
        DECIMAL distance_km
        BIGINT transport_fee
        BIGINT package_price
        DECIMAL service_fee_rate
        INT service_fee
        BIGINT total_price
        TEXT note
        ENUM status
        TIMESTAMP service_completed_at
        TIMESTAMP customer_confirmed_at
        TIMESTAMP cancelled_at
        TEXT cancel_reason
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PAYMENTS {
        BIGINT id PK
        BIGINT booking_id FK, UK
        VARCHAR order_id UK
        VARCHAR gateway
        VARCHAR gateway_transaction_id
        BIGINT gross_amount
        VARCHAR currency
        VARCHAR payment_method
        ENUM status
        VARCHAR gateway_status_raw
        BIGINT refunded_amount
        TEXT payload_json
        TIMESTAMP paid_at
        TIMESTAMP expired_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PAYMENT_EVENTS {
        BIGINT id PK
        BIGINT payment_id FK
        VARCHAR event_type
        VARCHAR gateway_status
        BOOLEAN signature_valid
        TEXT payload_json
        TIMESTAMP created_at
    }

    BOOKING_SETTLEMENTS {
        BIGINT id PK
        BIGINT booking_id FK, UK
        BIGINT photographer_user_id FK
        BIGINT gross_amount
        BIGINT package_price
        BIGINT transport_fee
        DECIMAL commission_rate
        BIGINT commission_amount
        BIGINT net_partner_amount
        ENUM status
        TIMESTAMP held_at
        TIMESTAMP ready_to_release_at
        TIMESTAMP released_at
        TIMESTAMP refunded_at
        BIGINT released_wallet_transaction_id FK
        TEXT notes
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    PARTNER_WALLETS {
        BIGINT user_id PK, FK
        BIGINT available_balance
        BIGINT pending_withdrawal_balance
        BIGINT total_earned
        BIGINT total_withdrawn
        TIMESTAMP updated_at
    }

    WITHDRAWAL_REQUESTS {
        BIGINT id PK
        BIGINT partner_user_id FK
        BIGINT requested_amount
        VARCHAR bank_name
        VARCHAR account_name
        VARCHAR account_number
        ENUM status
        TIMESTAMP requested_at
        TIMESTAMP reviewed_at
        TIMESTAMP paid_at
        BIGINT reviewed_by_user_id FK
        VARCHAR transfer_reference
        TEXT admin_note
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    WALLET_TRANSACTIONS {
        BIGINT id PK
        BIGINT wallet_user_id FK
        BIGINT booking_id FK
        BIGINT withdrawal_request_id FK
        ENUM type
        ENUM direction
        BIGINT amount
        BIGINT balance_before
        BIGINT balance_after
        VARCHAR reference_code
        TEXT description
        BIGINT created_by_user_id FK
        TIMESTAMP created_at
    }

    BOOKING_DISPUTES {
        BIGINT id PK
        BIGINT booking_id FK
        BIGINT opened_by_user_id FK
        ENUM type
        TEXT reason
        ENUM status
        TEXT resolution
        BIGINT resolved_by_user_id FK
        TIMESTAMP created_at
        TIMESTAMP resolved_at
    }

    ADMIN_NOTIFICATION_TOKENS {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR fcm_token
        VARCHAR user_agent
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    USERS ||--o| PARTNER_PROFILES : owns
    USERS ||--o{ PARTNER_GALLERY_ITEMS : uploads
    USERS ||--o{ PARTNER_CATEGORIES : owns_service_categories
    USERS ||--o{ PARTNER_PACKAGES : offers
    USERS ||--o{ PARTNER_SCHEDULES : blocks_time_for
    USERS ||--o{ PARTNER_APPLICATIONS : submits
    USERS ||--o{ BOOKINGS : receives_as_photographer
    USERS ||--o{ BOOKINGS : creates_as_customer
    PARTNER_CATEGORIES ||--o{ PARTNER_PACKAGES : groups
    PARTNER_PACKAGES ||--o{ BOOKINGS : selected_in

    BOOKINGS ||--|| PAYMENTS : has
    PAYMENTS ||--o{ PAYMENT_EVENTS : logs
    BOOKINGS ||--|| BOOKING_SETTLEMENTS : settles

    USERS ||--o| PARTNER_WALLETS : owns_wallet
    PARTNER_WALLETS ||--o{ WALLET_TRANSACTIONS : records
    USERS ||--o{ WITHDRAWAL_REQUESTS : requests_withdrawal
    USERS ||--o{ WITHDRAWAL_REQUESTS : reviews_as_superadmin
    WITHDRAWAL_REQUESTS ||--o{ WALLET_TRANSACTIONS : affects

    BOOKINGS ||--o{ BOOKING_DISPUTES : can_have
    USERS ||--o{ BOOKING_DISPUTES : opens
    USERS ||--o{ BOOKING_DISPUTES : resolves
    USERS ||--o{ ADMIN_NOTIFICATION_TOKENS : registers
```

## Catatan

- ERD ini menunjukkan target akhir arsitektur escrow AirisLens, bukan hanya kondisi schema runtime saat ini.
- Foreign key fisik yang sudah diterapkan ke database live tetap dirujuk oleh migration `database/migrations/2026-06-24_02_add_foreign_keys.sql`.
- Refactor identitas `partner_applications` ke `users` dirujuk oleh migration `database/migrations/2026-06-25_01_refactor_partner_applications_identity.sql`.
- `PARTNER_APPLICATIONS` hanya menyimpan data khusus pengajuan partner. Nama, email, dan nomor telepon pemohon diambil dari `USERS` lewat relasi `submitted_by_user_id`.
- `USERS.email_verified_at` menandai kapan akun selesai verifikasi email. `verification_token` menyimpan hash token verifikasi aktif dan `verification_expires_at` menyimpan masa berlakunya.
- `PARTNER_PROFILES.partner_type` membedakan partner perorangan dan studio. `team_quota` menentukan berapa booking aktif yang masih bisa diterima di slot jam yang sama.
- `PARTNER_CATEGORIES` menyimpan katalog kategori layanan milik masing-masing fotografer, misalnya Wedding atau Prewedding.
- `PARTNER_PACKAGES.category_id` menghubungkan setiap paket ke kategori layanan yang dipilih fotografer.
- `PARTNER_PROFILES.commission_rate` adalah snapshot persentase komisi default untuk booking baru partner tersebut.
- `PARTNER_PROFILES.free_distance_km` dan `flat_transport_fee` dipakai untuk logika transportasi aktif. `transport_fee_per_km` sementara dipertahankan hanya untuk kompatibilitas data lama.
- `BOOKINGS.category_id` disimpan sebagai snapshot kategori layanan saat booking dibuat. Kolom ini sengaja diperlakukan sebagai snapshot transaksi dan tidak wajib selalu ikut foreign key fisik.
- `BOOKINGS.package_name` tetap disimpan sebagai snapshot nama paket saat transaksi dibuat.
- `BOOKINGS.location` dipertahankan untuk kompatibilitas sistem lama, sedangkan data lokasi acara baru disimpan juga di `event_address`, `event_latitude`, dan `event_longitude`.
- `PAYMENTS` adalah sumber kebenaran untuk status transaksi gateway, sedangkan `BOOKINGS.status` dipakai untuk status proses bisnis booking.
- `BOOKING_SETTLEMENTS` adalah lapisan escrow dan pembagian hasil antara AirisLens dan fotografer.
- `PARTNER_WALLETS` hanya menyimpan saldo ringkasan; audit trail utamanya ada di `WALLET_TRANSACTIONS`.
- Migration foundation escrow yang aman ditaruh di `database/migrations/2026-06-25_03_add_finance_foundation.sql`.
- Cutover enum `BOOKINGS.status` ke status bisnis final belum aman diterapkan ke runtime sebelum backend payment dan webhook direfactor.
