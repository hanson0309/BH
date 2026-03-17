"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAllCache } from "@/lib/globalCache";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: string;
}

export default function FloatingChat() {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 }); // relative to bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const pathname = usePathname();
  const router = useRouter();

  const isEnterPage = pathname === "/enter";

  // 自动滚动到底部
  useEffect(() => {
    if (isEnterPage) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isEnterPage, messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isEnterPage) return;
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isEnterPage, isOpen]);

  // 登录页不显示时，确保下次进入首页时状态是干净的
  useEffect(() => {
    if (!isEnterPage) return;
    setIsOpen(false);
    setMessages([]);
    setInput("");
    setLoading(false);
    setError(null);
  }, [isEnterPage]);

  // 拖拽处理
  function handleDragStart(clientX: number, clientY: number) {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: position.x,
      posY: position.y,
    };
  }

  function handleDragMove(clientX: number, clientY: number) {
    if (!isDragging) return;
    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;
    setPosition({
      x: dragStartRef.current.posX + deltaX,
      y: dragStartRef.current.posY + deltaY,
    });
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  // 鼠标事件
  function onMouseDown(e: React.MouseEvent) {
    if (e.target instanceof HTMLElement && e.target.closest("button, input")) return;
    handleDragStart(e.clientX, e.clientY);
  }

  function onMouseMove(e: React.MouseEvent) {
    handleDragMove(e.clientX, e.clientY);
  }

  function onMouseUp() {
    handleDragEnd();
  }

  // 触摸事件
  function onTouchStart(e: React.TouchEvent) {
    if (e.target instanceof HTMLElement && e.target.closest("button, input")) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }

  function onTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }

  function onTouchEnd() {
    handleDragEnd();
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        if (data && typeof data === "object" && "error" in data) {
          const err = (data as { error?: unknown }).error;
          throw new Error(typeof err === "string" ? err : `请求失败: ${res.status}`);
        }
        throw new Error(`请求失败: ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, action: data.action },
      ]);
      
      // 处理 action - 刷新页面数据
      if (data.action === "refresh_todos" || data.action === "refresh_data") {
        // 触发自定义事件通知页面刷新数据
        window.dispatchEvent(new CustomEvent("refreshData", { detail: { type: "todos" } }));
      }
      if (data.action === "clear_cache") {
        clearAllCache();
        window.dispatchEvent(
          new CustomEvent("refreshData", { detail: { type: "all" } })
        );
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "发送消息失败，请重试";
      setError(msg || "发送消息失败，请重试");
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  function toggleChat() {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  }

  function minimizeChat() {
    setIsOpen(false);
    setIsMinimized(true);
  }

  // 添加快捷命令
  function handleQuickCommand(command: string) {
    setInput(command);
    // 直接发送
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      sendMessage();
    }, 100);
  }

  if (isEnterPage) return null;

  const positionStyle = {
    right: `${16 + position.x}px`,
    bottom: `${16 + position.y}px`,
  };

  // 最小化状态 - 只显示一个小圆点
  if (isMinimized) {
    return (
      <button
        onClick={toggleChat}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={positionStyle}
        className={`fixed z-50 w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-lg shadow-pink-300/50 hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        aria-label="打开AI助手"
      >
        <span className="text-lg">🤖</span>
        {/* 未读消息提示 */}
        {messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={positionStyle}
        className={`fixed z-50 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-lg shadow-pink-300/50 hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-white text-sm font-medium ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label="打开AI助手"
      >
        <span>🤖</span>
        <span>AI助手</span>
        {/* 未读消息提示 */}
        {messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            1
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={positionStyle}
      className="fixed z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl shadow-pink-200 border-2 border-pink-100 overflow-hidden animate-fadeIn"
    >
      {/* 头部 - 可拖拽 */}
      <div
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`bg-gradient-to-r from-rose-500 to-pink-500 p-4 flex items-center justify-between select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-white font-semibold text-sm">AI 助手</h3>
            <p className="text-white/80 text-xs">有什么可以帮您？</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="清空对话"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={minimizeChat}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="最小化"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 快捷命令 */}
      {messages.length === 0 && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs text-pink-400 mb-2">快捷指令：</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickCommand("添加待办 周末看电影")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              📝 添加待办
            </button>
            <button
              onClick={() => handleQuickCommand("查看待办")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              📋 待办列表
            </button>
            <button
              onClick={() => handleQuickCommand("有哪些纪念日")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              📅 纪念日
            </button>
            <button
              onClick={() => handleQuickCommand("查看胶囊")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              💊 时光胶囊
            </button>
            <button
              onClick={() => handleQuickCommand("查看照片")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              📸 照片墙
            </button>
            <button
              onClick={() => handleQuickCommand("总结日记")}
              className="px-3 py-1 bg-pink-50 text-pink-600 text-xs rounded-full hover:bg-pink-100 transition-colors"
            >
              📊 日记总结
            </button>
          </div>
        </div>
      )}

      {/* 消息区域 */}
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-pink-50/30 to-white">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">💕</span>
            <p className="text-pink-400 text-sm mt-2">我是你们的 AI 助手<br/>随时为你们提供帮助～</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-md"
                    : "bg-white border border-pink-100 text-pink-900 rounded-bl-md shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-pink-100 px-3 py-2 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-500 text-xs px-3 py-1.5 rounded-full">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 border-t border-pink-100 bg-white flex gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 px-3 py-2 bg-pink-50 border border-pink-200 rounded-xl text-sm text-pink-900 placeholder-pink-300 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "发送"}
        </button>
      </form>
    </div>
  );
}
