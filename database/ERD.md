# AirisLens ERD

```mermaid
erDiagram
    USERS {
        BIGINT id PK
        VARCHAR name
        VARCHAR email UK
        TEXT password_hash
        ENUM role
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

    PARTNER_PACKAGES {
        BIGINT id PK
        BIGINT user_id FK
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
        VARCHAR name
        VARCHAR email
        VARCHAR phone
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
        BIGINT package_id FK
        VARCHAR customer_name
        VARCHAR customer_phone
        VARCHAR package_name
        BIGINT amount
        DATE booking_date
        VARCHAR booking_time
        TEXT location
        TEXT note
        ENUM status
        TIMESTAMP created_at
        TIMESTAMP updated_at
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
    USERS ||--o{ PARTNER_PACKAGES : offers
    USERS ||--o{ PARTNER_SCHEDULES : blocks_time_for
    USERS ||--o{ PARTNER_APPLICATIONS : submits
    USERS ||--o{ BOOKINGS : receives_as_photographer
    USERS ||--o{ BOOKINGS : creates_as_customer
    PARTNER_PACKAGES ||--o{ BOOKINGS : selected_in
    USERS ||--o{ ADMIN_NOTIFICATION_TOKENS : registers
```

## Catatan

- Relasi di atas mengikuti kolom referensi yang dipakai aplikasi, walau sebagian belum dideklarasikan sebagai `FOREIGN KEY` di SQL.
- `BOOKINGS.package_name` disimpan sebagai snapshot nama paket saat transaksi dibuat, jadi tetap ada walaupun data paket berubah.
- `BOOKINGS.customer_user_id` dan `PARTNER_APPLICATIONS.submitted_by_user_id` bersifat opsional.
