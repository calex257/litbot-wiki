"use client";
import { useState, useEffect, useRef } from "react";
import { Message } from "@/types/message";
import { Send, ThumbsUp, ThumbsDown, MessageSquare, Check, Trash2 } from "react-feather";
import LoadingDots from "@/components/LoadingDots";

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Chat session type
type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
};

// Default welcome message
const getWelcomeMessage = (): Message => ({
  id: generateId(),
  role: "assistant",
  content: `Salut! Sunt **LitBot**. Îmi poți pune orice întrebare despre operele studiate la Bac.

Întreabă-mă ceva de exemplu:
• „Care este tema romanului *Ion*?"
• „Ce relație există între Ghiță și Ana în *Moara cu noroc*?"
• „Ce element unic are romanul *Ion* față de alte opere?"`,
  feedback: null,
  comment: "",
  commentSubmitted: false,
});

// Create a new chat session
const createNewChat = (): ChatSession => ({
  id: generateId(),
  title: "New Chat",
  messages: [getWelcomeMessage()],
  createdAt: new Date(),
});

// Dummy function to simulate sending feedback to a metrics service
const sendFeedbackToMetrics = (data: {
  messageId: string;
  feedback?: "positive" | "negative" | null;
  comment?: string;
}) => {
  console.log("[Metrics] Feedback received:", data);
};

export default function LiteraryChat() {
  const [userInput, setUserInput] = useState<string>("");
  const [chats, setChats] = useState<ChatSession[]>([createNewChat()]);
  const [activeChatId, setActiveChatId] = useState<string>(chats[0].id);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);

  // Get the active chat
  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const chatLog = activeChat.messages;

  // Update messages in the active chat
  const updateActiveChat = (updater: (messages: Message[]) => Message[]) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: updater(chat.messages) }
          : chat
      )
    );
  };

  // Update chat title based on first user message
  const updateChatTitle = (title: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId ? { ...chat, title } : chat
      )
    );
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessageId = generateId();
    const assistantMessageId = generateId();
    const isFirstUserMessage = !chatLog.some((m) => m.role === "user");

    // Update title if this is the first user message
    if (isFirstUserMessage) {
      const title = userInput.length > 30 ? userInput.substring(0, 30) + "..." : userInput;
      updateChatTitle(title);
    }

    updateActiveChat((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: userInput, feedback: null },
      { id: assistantMessageId, role: "assistant", content: "", feedback: null, comment: "", commentSubmitted: false },
    ]);

    setUserInput("");
    setIsWaiting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userInput,
          history: [...chatLog, { role: "user", content: userInput }],
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += new TextDecoder().decode(value);

          updateActiveChat((prev) => {
            const newLog = [...prev];
            for (let i = newLog.length - 1; i >= 0; i--) {
              if (newLog[i].role === "assistant") {
                newLog[i] = { ...newLog[i], content: buffer };
                break;
              }
            }
            return newLog;
          });
        }
      }
      setIsWaiting(false);
    } catch (error) {
      alert("A apărut o eroare: " + error);
      setIsWaiting(false);
    }
  };

  const handleFeedback = (messageId: string, type: "positive" | "negative") => {
    updateActiveChat((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: type } : msg
      )
    );
    sendFeedbackToMetrics({ messageId, feedback: type });
  };

  const handleCommentChange = (messageId: string, comment: string) => {
    updateActiveChat((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, comment } : msg
      )
    );
  };

  const submitComment = (messageId: string) => {
    const message = chatLog.find((msg) => msg.id === messageId);
    if (message && message.comment?.trim()) {
      updateActiveChat((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, commentSubmitted: true } : msg
        )
      );
      sendFeedbackToMetrics({
        messageId,
        feedback: message.feedback,
        comment: message.comment,
      });
    }
  };

  // Create a new chat
  const handleNewChat = () => {
    const newChat = createNewChat();
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  // Switch to a different chat
  const switchChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  // Delete a chat
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setChats((prev) => {
      const filtered = prev.filter((c) => c.id !== chatId);
      // If we deleted the active chat, switch to another one
      if (chatId === activeChatId && filtered.length > 0) {
        setActiveChatId(filtered[0].id);
      }
      // If no chats left, create a new one
      if (filtered.length === 0) {
        const newChat = createNewChat();
        setActiveChatId(newChat.id);
        return [newChat];
      }
      return filtered;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog]);

  return (
    <div
      className="app"
      style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", height: "100vh" }}
    >
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">Lb</div>
          <div>
            <div className="sb-title">LitBot</div>
            <div className="sb-sub">Literature Chat</div>
          </div>
        </div>

        <button className="sb-btn" onClick={handleNewChat}>
          <span className="icon">＋</span>
          <span>New Chat</span>
        </button>

        <div className="sb-label">Recent chats</div>
        <div className="sb-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`sb-item ${chat.id === activeChatId ? "active" : ""}`}
              onClick={() => switchChat(chat.id)}
            >
              <span className="dot"></span>
              <span className="sb-item-title">{chat.title}</span>
              {chats.length > 1 && (
                <button
                  className="sb-item-delete"
                  onClick={(e) => deleteChat(chat.id, e)}
                  title="Șterge conversația"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="sb-footer">
          <div>LitBot — Chatbot literar</div>
          <a href="/home.html">← Back to overview</a>
        </div>
      </aside>

      {/* Chat Area */}
      <section className="chat-wrap">
        <header className="chat-header">
          <div className="chat-title">LitBot — Literature Assistant</div>
        </header>

        <div className="chat-main">
          {chatLog.map((item, index) => {
            const last = index === chatLog.length - 1;
            const isAssistant = item.role === "assistant";
            const showLoader = isAssistant && item.content === "" && isWaiting;
            const showFeedback = isAssistant && item.content !== "" && !showLoader;

            return (
              <div
                ref={last ? scrollRef : null}
                key={item.id || index}
                className={`msg ${isAssistant ? "bot" : "user"}`}
              >
                {isAssistant && (
                  <img className="avatar" src="/images/assistant-avatar.png" alt="LitBot" />
                )}
                <div className="msg-content">
                  {showLoader ? (
                    <LoadingDots />
                  ) : (
                    <>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(item.content),
                        }}
                      />
                      {/* Feedback section for bot messages */}
                      {showFeedback && (
                        <div className="feedback-section">
                          {/* Thumbs up/down buttons */}
                          <div className="feedback-buttons">
                            <span className="feedback-label">Răspunsul a fost util?</span>
                            <button
                              className={`feedback-btn ${item.feedback === "positive" ? "active positive" : ""}`}
                              onClick={() => item.id && handleFeedback(item.id, "positive")}
                              title="Răspuns util"
                              disabled={item.feedback !== null}
                            >
                              <ThumbsUp size={14} />
                            </button>
                            <button
                              className={`feedback-btn ${item.feedback === "negative" ? "active negative" : ""}`}
                              onClick={() => item.id && handleFeedback(item.id, "negative")}
                              title="Răspuns neutil"
                              disabled={item.feedback !== null}
                            >
                              <ThumbsDown size={14} />
                            </button>
                          </div>

                          {/* Comment field */}
                          <div className="feedback-comment">
                            {item.commentSubmitted ? (
                              <div className="comment-submitted">
                                <Check size={14} />
                                <span>Mulțumim pentru feedback!</span>
                              </div>
                            ) : (
                              <>
                                <div className="comment-input-row">
                                  <MessageSquare size={14} className="comment-icon" />
                                  <input
                                    type="text"
                                    className="comment-input"
                                    placeholder="Lasă un comentariu despre acest răspuns..."
                                    value={item.comment || ""}
                                    onChange={(e) => item.id && handleCommentChange(item.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && item.id) {
                                        e.preventDefault();
                                        submitComment(item.id);
                                      }
                                    }}
                                  />
                                  <button
                                    className="comment-submit"
                                    onClick={() => item.id && submitComment(item.id)}
                                    disabled={!item.comment?.trim()}
                                  >
                                    Trimite
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="chat-input-wrap">
          <div className="input-inner">
            <form
              className="input-box"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <input
                type="text"
                placeholder="Pune o întrebare despre orice operă..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit" disabled={!userInput.trim() || isWaiting}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatMessage(content: string): string {
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br />")
    .replace(/• /g, "<br />• ");

  return formatted;
}
