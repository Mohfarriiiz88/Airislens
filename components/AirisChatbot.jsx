"use client";

import { BotMessageSquare, SendHorizonal, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WELCOME_MESSAGE = {
  id: "welcome-message",
  role: "assistant",
  content:
    "Halo, aku Airis AI. Tanya saja soal paket foto, alur booking, jadwal, atau pembayaran AirisLens.",
};

function ChatBubble({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "rounded-br-md bg-neutral-950 text-white"
            : "rounded-bl-md border border-black/5 bg-white text-neutral-900",
        ].join(" ")}
      >
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-3xl rounded-bl-md border border-black/5 bg-white px-4 py-3 shadow-sm">
        <div className="airis-chatbot-dots flex items-center gap-1.5">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function AirisChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const endOfMessagesRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  async function handleSubmit(event) {
    event?.preventDefault();

    const trimmedMessage = input.trim();

    if (!trimmedMessage || isLoading) {
      if (!trimmedMessage) {
        setError("Pesan tidak boleh kosong.");
      }
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedMessage,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "AI sedang tidak bisa merespons.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (submitError) {
      const fallbackMessage =
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kendala saat menghubungi Airis AI.";

      setError(fallbackMessage);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "Maaf, Airis AI sedang mengalami kendala. Coba kirim lagi beberapa saat lagi.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleTextareaKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[10000]">
      <div className="pointer-events-none mx-auto flex w-full max-w-[1440px] justify-end px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {isOpen ? (
            <section className="flex h-[min(70vh,620px)] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,rgba(253,253,253,0.98)_0%,rgba(244,239,232,0.98)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-black/8 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-lg shadow-black/20">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-neutral-500">
                      AirisLens Assistant
                    </p>
                    <h2 className="text-lg font-medium text-neutral-950">
                      Airis AI
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-neutral-700 transition hover:bg-white hover:text-black"
                  aria-label="Tutup chatbot"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),rgba(244,239,232,0.45)_55%,rgba(244,239,232,0.2)_100%)] px-4 py-4 sm:px-5">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                    />
                  ))}
                  {isLoading ? <TypingIndicator /> : null}
                  <div ref={endOfMessagesRef} />
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-black/8 bg-white/70 px-4 py-4 backdrop-blur sm:px-5"
              >
                <label className="sr-only" htmlFor="airis-chatbot-input">
                  Tulis pesan ke Airis AI
                </label>
                <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                  <textarea
                    id="airis-chatbot-input"
                    ref={textareaRef}
                    rows={2}
                    value={input}
                    onChange={(event) => {
                      setInput(event.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Tanya paket foto, jadwal, atau alur booking..."
                    className="min-h-[76px] w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-neutral-900 outline-none placeholder:text-neutral-400"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between border-t border-black/6 px-3 py-3">
                    <p className="text-xs text-neutral-500">
                      Enter untuk kirim, Shift+Enter untuk baris baru.
                    </p>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-white transition hover:scale-[1.02] hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Kirim pesan"
                    >
                      <SendHorizonal size={18} />
                    </button>
                  </div>
                </div>
                {error ? (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                ) : null}
              </form>
            </section>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setIsOpen((current) => !current);
              if (error) {
                setError("");
              }
            }}
            className="group flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#111111_0%,#3a3129_100%)] text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(0,0,0,0.42)]"
            aria-label={isOpen ? "Tutup Airis AI" : "Buka Airis AI"}
          >
            <BotMessageSquare
              size={28}
              className="transition group-hover:scale-105"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
