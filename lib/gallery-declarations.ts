export const GALLERY_DECLARATION_ERROR_MESSAGE =
  "Anda harus menyetujui seluruh pernyataan dan persetujuan sebelum mengunggah foto.";

export const GALLERY_UPLOAD_DECLARATIONS = [
  {
    key: "ownershipDeclared",
    label: "Hak karya",
    statement:
      "Saya menyatakan bahwa foto yang saya unggah merupakan karya milik saya atau karya yang secara sah saya memiliki hak untuk menggunakannya sebagai portofolio.",
  },
  {
    key: "subjectConsentDeclared",
    label: "Persetujuan subjek",
    statement:
      "Saya menyatakan bahwa saya telah memperoleh persetujuan yang diperlukan dari orang atau pihak yang terdapat dalam foto untuk menggunakan dan menampilkan foto ini sebagai portofolio secara publik.",
  },
  {
    key: "publicationConsentDeclared",
    label: "Persetujuan publikasi",
    statement:
      "Saya memberikan izin kepada AirisLens untuk menampilkan foto ini pada galeri dan profil fotografer sebagai bagian dari portofolio layanan saya.",
  },
  {
    key: "responsibilityAccepted",
    label: "Tanggung jawab",
    statement:
      "Saya memahami dan bertanggung jawab atas kebenaran pernyataan tersebut serta bersedia menindaklanjuti apabila terdapat keberatan atau klaim terhadap foto yang saya unggah.",
  },
] as const;

export type GalleryDeclarationKey =
  (typeof GALLERY_UPLOAD_DECLARATIONS)[number]["key"];

export type GalleryDeclarationPayload = Record<GalleryDeclarationKey, boolean>;

export const EMPTY_GALLERY_DECLARATIONS: GalleryDeclarationPayload = {
  ownershipDeclared: false,
  subjectConsentDeclared: false,
  publicationConsentDeclared: false,
  responsibilityAccepted: false,
};

function isTruthyDeclarationValue(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1;
}

export function normalizeGalleryDeclarationPayload(input: {
  ownershipDeclared?: unknown;
  publicationConsentDeclared?: unknown;
  responsibilityAccepted?: unknown;
  subjectConsentDeclared?: unknown;
}) {
  return {
    ownershipDeclared: isTruthyDeclarationValue(input.ownershipDeclared),
    subjectConsentDeclared: isTruthyDeclarationValue(
      input.subjectConsentDeclared
    ),
    publicationConsentDeclared: isTruthyDeclarationValue(
      input.publicationConsentDeclared
    ),
    responsibilityAccepted: isTruthyDeclarationValue(
      input.responsibilityAccepted
    ),
  } satisfies GalleryDeclarationPayload;
}

export function galleryDeclarationsAccepted(
  payload: Partial<GalleryDeclarationPayload> | null | undefined
) {
  if (!payload) {
    return false;
  }

  return GALLERY_UPLOAD_DECLARATIONS.every((item) => payload[item.key] === true);
}
