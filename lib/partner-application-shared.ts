export type PartnerApplicationKind = "individual" | "studio";

export type PartnerApplicationStatus = "pending" | "approved" | "rejected";

export const PARTNER_APPLICATION_SERVICE_OPTIONS = [
  "Wedding",
  "Prewedding",
  "Engagement / Lamaran",
  "Graduation",
  "Event",
  "Product",
  "Portrait",
  "Lainnya",
] as const;

export type PartnerApplicationService =
  (typeof PARTNER_APPLICATION_SERVICE_OPTIONS)[number];

export const PARTNER_TERMS_VERSION = "1.0";

export const PARTNER_TERMS_ERROR_MESSAGE =
  "Anda harus menyetujui Pernyataan & Persetujuan Mitra AirisLens sebelum mengajukan verifikasi.";

export const PARTNER_TERMS_APPROVAL_LABEL =
  "Saya telah membaca, memahami, dan menyetujui Pernyataan & Persetujuan Mitra AirisLens di atas.";

export const PARTNER_TERMS_CLAUSES = [
  {
    title: "Kebenaran Informasi",
    statement:
      "Saya menyatakan bahwa seluruh informasi, identitas profesional, pengalaman, akun media sosial, dan portofolio yang saya berikan dalam proses pendaftaran adalah benar dan dapat dipertanggungjawabkan.",
  },
  {
    title: "Perlindungan Data Pribadi",
    statement:
      "Saya memahami dan menyetujui bahwa AirisLens dapat mengumpulkan, menyimpan, dan memproses data pribadi yang saya berikan untuk keperluan pendaftaran, verifikasi mitra, pengelolaan akun, komunikasi, serta penyelenggaraan layanan AirisLens sesuai dengan kebijakan privasi dan ketentuan peraturan perundang-undangan yang berlaku.",
  },
  {
    title: "Hak atas Portofolio dan Karya",
    statement:
      "Saya menyatakan bahwa foto, portofolio, atau materi lain yang saya berikan merupakan karya milik saya atau materi yang secara sah dapat saya gunakan dan tampilkan sebagai bagian dari portofolio.",
  },
  {
    title: "Persetujuan Subjek dalam Foto",
    statement:
      "Apabila portofolio memuat foto seseorang atau pihak lain, saya menyatakan telah memperoleh izin atau persetujuan yang diperlukan untuk menggunakan dan menampilkan foto tersebut sebagai portofolio sesuai dengan ketentuan yang berlaku.",
  },
  {
    title: "Penggunaan Portofolio di AirisLens",
    statement:
      "Saya memberikan izin kepada AirisLens untuk menampilkan portofolio yang saya unggah atau daftarkan pada halaman profil fotografer, galeri, dan bagian lain pada platform AirisLens yang berkaitan dengan penawaran jasa fotografi saya.",
  },
  {
    title: "Verifikasi AirisLens",
    statement:
      "Saya bersedia AirisLens melakukan pemeriksaan terhadap informasi dan portofolio yang saya berikan sebagai bagian dari proses verifikasi. Saya memahami bahwa pengajuan tidak menjamin persetujuan sebagai mitra dan AirisLens berhak menerima atau menolak pengajuan berdasarkan hasil verifikasi.",
  },
  {
    title: "Tanggung Jawab",
    statement:
      "Saya bertanggung jawab atas kebenaran informasi serta hak penggunaan materi yang saya berikan dan bersedia menindaklanjuti apabila terdapat keberatan atau klaim yang berkaitan dengan materi tersebut.",
  },
] as const;

export const INDIVIDUAL_DECLARATIONS = [
  "Saya menyatakan bahwa informasi yang saya berikan dalam pengajuan ini adalah benar dan dapat dipertanggungjawabkan.",
  "Saya menyatakan bahwa portofolio yang saya lampirkan merupakan karya yang saya miliki atau karya yang penggunaannya menjadi tanggung jawab saya.",
  "Saya menyatakan bahwa saya memiliki hak atau persetujuan yang diperlukan untuk menggunakan karya tersebut sebagai portofolio pada AirisLens.",
  "Saya bersedia apabila AirisLens melakukan verifikasi terhadap informasi, akun profesional, dan portofolio yang saya berikan.",
] as const;

export const STUDIO_DECLARATIONS = [
  "Saya menyatakan bahwa saya merupakan pemilik, pengelola, atau pihak yang memiliki kewenangan untuk mewakili studio foto yang didaftarkan.",
  "Saya menyatakan bahwa seluruh informasi mengenai studio yang diberikan adalah benar dan dapat dipertanggungjawabkan.",
  "Saya menyatakan bahwa portofolio yang dilampirkan merupakan karya studio atau karya yang penggunaannya berada dalam kewenangan studio.",
  "Saya menyatakan bahwa studio memiliki hak atau persetujuan yang diperlukan untuk menggunakan karya tersebut sebagai portofolio pada AirisLens.",
  "Saya bersedia apabila AirisLens melakukan proses verifikasi terhadap studio, lokasi, akun profesional, dan portofolio yang diberikan.",
] as const;

export function getPartnerTypeLabel(partnerType: PartnerApplicationKind) {
  return partnerType === "studio" ? "Studio Foto" : "Fotografer";
}

export function getPartnerTypeDescription(partnerType: PartnerApplicationKind) {
  return partnerType === "studio"
    ? "Usaha/studio fotografi yang menawarkan jasa fotografi menggunakan identitas studio."
    : "Fotografer profesional/freelance yang menawarkan jasa fotografi secara individu.";
}

export function getPartnerApplicationDeclarations(
  partnerType: PartnerApplicationKind
) {
  return partnerType === "studio"
    ? [...STUDIO_DECLARATIONS]
    : [...INDIVIDUAL_DECLARATIONS];
}

export function buildPartnerApplicationSubmittedMessage(input: {
  name: string;
  partnerType: PartnerApplicationKind;
}) {
  return [
    `Halo, ${input.name.trim()}!`,
    "",
    `Pengajuan Anda sebagai ${getPartnerTypeLabel(input.partnerType)} di AirisLens telah berhasil dikirim.`,
    "",
    "Tim AirisLens akan melakukan verifikasi terhadap informasi dan portofolio yang Anda berikan.",
    "",
    "Status: Menunggu Verifikasi",
    "",
    "Kami akan menghubungi Anda kembali setelah proses verifikasi selesai.",
  ].join("\n");
}

export function buildPartnerApplicationApprovedMessage(input: {
  name: string;
  partnerType: PartnerApplicationKind;
}) {
  return [
    `Selamat, ${input.name.trim()}!`,
    "",
    `Pengajuan Anda sebagai ${getPartnerTypeLabel(input.partnerType)} di AirisLens telah disetujui.`,
    "",
    "Akun Anda sekarang telah mendapatkan akses sebagai mitra AirisLens.",
    "",
    "Silakan login untuk melengkapi profil, paket layanan, dan portofolio Anda.",
    "",
    "Status: Terverifikasi",
  ].join("\n");
}

export function buildPartnerApplicationRejectedMessage(input: {
  name: string;
  partnerType: PartnerApplicationKind;
  rejectionReason: string;
}) {
  return [
    `Halo, ${input.name.trim()}.`,
    "",
    `Pengajuan Anda sebagai ${getPartnerTypeLabel(input.partnerType)} di AirisLens belum dapat kami setujui.`,
    "",
    "Alasan:",
    input.rejectionReason.trim(),
    "",
    "Silakan memperbaiki data atau bukti verifikasi yang diperlukan kemudian mengajukan kembali.",
    "",
    "Status: Ditolak",
  ].join("\n");
}
