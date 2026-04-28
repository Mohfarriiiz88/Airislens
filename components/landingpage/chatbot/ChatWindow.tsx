"use client";
import { useState } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({ onClose }: any) {
  const [messages, setMessages] = useState([
    { role: "bot", content: "Hi, aku Airis 👋 Ada yang bisa aku bantu?" },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
  if (!input.trim()) return;

  const userMsg = { role: "user", content: input };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  // Typing delay biar terasa real
  setTimeout(() => {
    const botReply = generateDummyResponse(input);

    const botMsg = {
      role: "bot",
      content: botReply,
    };

    setMessages((prev) => [...prev, botMsg]);
  }, 700);
};
function generateDummyResponse(input: string): string {
  const text = input.toLowerCase();

  if (text.includes("prewedding")) {
    return "Untuk prewedding, kamu bisa pilih style seperti cinematic, romantic, atau dark minimalis. Mau aku rekomendasikan fotografernya?";
  }

  if (text.includes("harga")) {
    return "Harga foto mulai dari Rp500.000, tergantung paket dan kebutuhan kamu.";
  }

  if (text.includes("style")) {
    return "Kami punya beberapa style seperti dark, minimalis, cinematic, dan romantic. Kamu lagi tertarik yang mana?";
  }

  if (text.includes("fotografer") || text.includes("fg")) {
    return "Beberapa fotografer yang bisa kamu pertimbangkan: Beranjak Photo (cinematic) dan Aether Studio (minimalis). Kamu suka yang seperti apa?";
  }

  return "Menarik! Bisa kamu jelaskan lebih detail kebutuhan kamu? Aku bantu rekomendasikan yang paling cocok 😊";
}
  return (
    <div className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-white border border-black/10 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <span className="font-semibold">Airis Assistant</span>
        <button onClick={onClose}>✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="Tanyakan sesuatu..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}