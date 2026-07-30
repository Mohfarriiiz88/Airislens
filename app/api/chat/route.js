import { listPublicPartnerKnowledge } from "@/lib/partner-cms";
import { BOOKING_TIME_SLOTS } from "@/lib/time-slots";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SYSTEM_PROMPT =
  "Kamu adalah Airis AI, asisten virtual website booking jasa fotografer AirisLens. Jawab dalam bahasa Indonesia yang ramah, santai, singkat, dan membantu pelanggan memahami layanan fotografi, rekomendasi paket foto, alur booking, jadwal, pembayaran, dan informasi umum website. Buat jawaban rapi dan mudah dipindai: gunakan paragraf pendek, bullet list jika ada beberapa poin, dan langkah bernomor jika menjelaskan proses. Jika relevan, gunakan label singkat seperti 'Ringkas:', 'Pilihan:', atau 'Langkah:'. Hindari paragraf panjang, tabel, dan jawaban di luar konteks AirisLens yang terlalu panjang.";

export const runtime = "nodejs";

function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.type === "text") {
          return item.text ?? "";
        }

        return "";
      })
      .join(" ")
      .trim();
  }

  return "";
}

function formatPartnerKnowledge(partners) {
  if (!partners.length) {
    return "Saat ini belum ada data fotografer partner yang bisa ditampilkan.";
  }

  return partners
    .map((partner, index) => {
      const specializations =
        partner.specializations.length > 0
          ? partner.specializations.join(", ")
          : partner.category || "General";
      const packageGroups = partner.packages.reduce((groups, item) => {
        const categoryName = item.categoryName || "General";
        const currentItems = groups[categoryName] || [];

        currentItems.push(
          `${item.name} (${item.duration}, Rp${Number(item.price).toLocaleString("id-ID")})`
        );
        groups[categoryName] = currentItems;

        return groups;
      }, {});
      const packageSummary =
        Object.keys(packageGroups).length > 0
          ? Object.entries(packageGroups)
              .map(([categoryName, items]) => `${categoryName}: ${items.join(", ")}`)
              .join("; ")
          : "Belum ada paket yang ditampilkan.";
      const location = partner.address?.trim() || "Lokasi belum diisi.";
      const description = partner.description?.trim() || "Deskripsi belum diisi.";
      const whatsapp = partner.whatsapp?.trim() || "Belum diisi.";

      return `${index + 1}. ${partner.brandName} | slug: ${partner.slug} | spesialisasi: ${specializations} | lokasi: ${location} | WhatsApp: ${whatsapp} | deskripsi: ${description} | paket: ${packageSummary}`;
    })
    .join("\n");
}

function buildWebsiteContext(partners) {
  return [
    "Konteks website AirisLens saat ini:",
    "- Halaman utama untuk cari fotografer adalah /findfg.",
    "- Daftar fotografer yang tampil ke publik diambil dari partner admin yang aktif di website.",
    "- User bisa membuka detail fotografer di /findfg/[slug], melihat profil, spesialisasi, lokasi, kontak WhatsApp, galeri, kategori layanan, dan paket yang difilter per kategori.",
    "- Dari detail fotografer, tombol booking mengarah ke /bookingform?photographerId={userId fotografer}&categoryId={categoryId}&packageId={packageId}.",
    "- Form booking meminta nama, nomor WhatsApp, kategori layanan, paket, tanggal, jam mulai, lokasi acara, titik koordinat, dan catatan.",
    `- Pilihan jam mulai booking di form menggunakan slot dasar: ${BOOKING_TIME_SLOTS.join(", ")}.`,
    "- Sistem mengecek ketersediaan berdasarkan durasi paket, sehingga seluruh rentang waktu booking harus kosong agar user bisa melanjutkan.",
    "- Saat submit booking, sistem menghitung harga paket, biaya transportasi, biaya layanan, membuat order, membuka popup pembayaran Midtrans Snap sandbox, dan menyimpan booking terlebih dahulu.",
    "- Status booking database yang digunakan website: pending_payment, confirmed, in_progress, awaiting_confirmation, completed, cancelled, disputed, dan refunded.",
    "- Jika pembayaran sukses, status booking akan diperbarui otomatis lewat notifikasi Midtrans.",
    "- Jika popup pembayaran ditutup atau pembayaran masih pending, booking tetap tercatat dan menunggu update status dari Midtrans.",
    "- Sistem juga mencoba mengirim notifikasi WhatsApp setelah booking dibuat.",
    "- Halaman riwayat booking ada di /bookinghistory dan hanya bisa diakses user yang login sebagai customer.",
    "- Jika pertanyaan menyebut fotografer yang tersedia, jawab berdasarkan daftar partner berikut.",
    "Daftar fotografer dan paket publik:",
    formatPartnerKnowledge(partners),
    "- Jika informasi tidak ada di konteks ini, katakan secara jujur bahwa detailnya belum tersedia di website.",
  ].join("\n");
}

export async function POST(request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const appOrigin = new URL(request.url).origin;
    let websiteContext = buildWebsiteContext([]);

    try {
      const publicPartners = await listPublicPartnerKnowledge();
      websiteContext = buildWebsiteContext(publicPartners);
    } catch (knowledgeError) {
      console.error("AIRIS AI KNOWLEDGE ERROR:", knowledgeError);
    }

    if (!apiKey) {
      return Response.json(
        { error: "OPENROUTER_API_KEY belum tersedia di server." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const incomingMessages = Array.isArray(body?.messages) ? body.messages : [];
    const sanitizedMessages = incomingMessages
      .filter(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim()
      )
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    const latestUserMessage = [...sanitizedMessages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json(
        { error: "Pesan pengguna tidak valid atau kosong." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let openRouterResponse;

    try {
      openRouterResponse = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": appOrigin,
          "X-Title": "AirisLens Chatbot",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "system",
              content: websiteContext,
            },
            ...sanitizedMessages,
          ],
          temperature: 0.7,
        }),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseData = await openRouterResponse.json().catch(() => null);

    if (!openRouterResponse.ok) {
      const providerError =
        responseData?.error?.message ||
        responseData?.message ||
        "OpenRouter gagal memproses permintaan.";

      return Response.json({ error: providerError }, { status: 502 });
    }

    const reply = normalizeContent(
      responseData?.choices?.[0]?.message?.content
    );

    if (!reply) {
      return Response.json(
        { error: "Airis AI tidak mengembalikan jawaban." },
        { status: 502 }
      );
    }

    return Response.json({
      reply,
      model: responseData?.model ?? "openrouter/free",
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return Response.json(
        { error: "Waktu tunggu Airis AI habis. Coba lagi sebentar." },
        { status: 504 }
      );
    }

    return Response.json(
      { error: "Terjadi gangguan saat menghubungi Airis AI." },
      { status: 500 }
    );
  }
}
