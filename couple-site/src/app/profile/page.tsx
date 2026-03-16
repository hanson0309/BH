"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clearCache, globalCache } from "@/lib/globalCache";

type Profile = {
  role: "A" | "B";
  name: string;
  birthday: string | null;
  avatar: string;
  nickname: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("invalid_result"));
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialized = useRef(false);

  // Form state - 使用 local state 来保存输入值
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatar, setAvatar] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [togetherSince, setTogetherSince] = useState("");

  const refresh = useCallback(async (force = false) => {
    // 如果有缓存且不是强制刷新，直接使用缓存
    if (!force && globalCache.profiles) {
      const profiles = globalCache.profiles as { A?: Profile; B?: Profile };
      // 确保缓存格式正确
      if (profiles?.A && profiles?.B) {
        const coupleData = globalCache.coupleData as { togetherSince: string | null } | undefined;
        const myRole = profiles.A.role === "A" ? "A" : "B";
        const myProfile = profiles[myRole];
        const partnerProfile = myRole === "A" ? profiles.B : profiles.A;
        if (myProfile && partnerProfile) {
          setMe(myProfile);
          setPartner(partnerProfile);
          setName(myProfile.name || "");
          setBirthday(myProfile.birthday || "");
          setAvatar(myProfile.avatar || "");
          setPartnerNickname(partnerProfile.nickname || "");
          setTogetherSince(coupleData?.togetherSince || "");
          setLoading(false);
          return;
        }
      }
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("unauthorized");
      const data = await res.json();
      console.log("Loaded data:", data); // 调试
      setMe(data.me);
      setPartner(data.partner);
      setName(data.me.name || "");
      setBirthday(data.me.birthday || "");
      setAvatar(data.me.avatar || "");
      setPartnerNickname(data.partner.nickname || "");
      setTogetherSince(data.togetherSince || "");
      // 存入缓存
      const profiles = {
        A: data.me.role === "A" ? data.me : data.partner,
        B: data.me.role === "B" ? data.me : data.partner
      };
      globalCache.profiles = profiles;
      globalCache.coupleData = { togetherSince: data.togetherSince };
    } catch (e) {
      console.error("Load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      refresh();
    }
  }, [refresh]);

  const save = useCallback(async (field: "name" | "birthday" | "avatar" | "partnerNickname" | "togetherSince", value: string) => {
    setSaving(true);
    setMessage(null);
    try {
      console.log("Saving:", field, value.substring(0, 20) + "..."); // 调试
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Save failed:", err);
        throw new Error("save_failed");
      }
      
      // 直接使用返回的数据更新状态
      const data = await res.json();
      console.log("Saved data returned:", data); // 调试
      setMe(data.me);
      setPartner(data.partner);
      
      // 更新表单状态为服务器返回的最新值
      setName(data.me.name || "");
      setBirthday(data.me.birthday || "");
      setAvatar(data.me.avatar || "");
      setPartnerNickname(data.partner.nickname || "");
      setTogetherSince(data.togetherSince || "");
      
      setMessage("已保存 ✓");
    } catch (e) {
      console.error("Save error:", e);
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  }, []);

  // 给对象备注名自动保存（输入1秒后自动保存）
  useEffect(() => {
    // 如果没加载完数据，不自动保存
    if (loading || !me) return;
    
    // 如果值和服务器返回的一样，不需要保存
    if (partnerNickname === (partner?.nickname || "")) return;

    const timer = setTimeout(() => {
      save("partnerNickname", partnerNickname);
    }, 1000);

    return () => clearTimeout(timer);
  }, [partnerNickname, loading, me, save]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);

      // 头像上传后清除缓存，强制下次重新获取
      clearCache("profiles");
      setAvatar(base64);
      await save("avatar", base64);
    } catch {
      setMessage("头像上传失败");
    }
  }

  // 计算在一起的天数
  function getTogetherDays(since: string) {
    if (!since) return null;
    const start = new Date(since);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getAge(birthday: string | null) {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  if (loading || !me) {
    return (
      <div className="min-h-screen py-8 pt-16">
        <div className="mx-auto w-full max-w-2xl px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-pink-200 animate-pulse" />
            <div className="h-6 w-24 bg-pink-200 rounded animate-pulse" />
          </div>
          <div className="rounded-2xl bg-white border-2 border-pink-100 p-6 shadow-sm">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-pink-200 animate-pulse mb-2" />
            </div>
            <div className="space-y-4">
              <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
              <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200">
              <span className="text-xl">👤</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
              个人资料
            </h1>
          </div>
          <Link
            className="text-sm text-pink-500 hover:text-pink-700 font-medium px-3 py-1.5 rounded-xl hover:bg-pink-50 transition-colors"
            href="/"
          >
            返回
          </Link>
        </div>

        {/* 我的资料卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-200 to-rose-200 rounded-3xl blur opacity-50" />
          <div className="relative rounded-2xl bg-white border-2 border-pink-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-lg">👤</span>
              <span className="font-semibold text-pink-800">我的资料</span>
            </div>

            {/* 头像 */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-pink-200 bg-pink-50">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="avatar"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {me.role === "A" ? "👦" : "👧"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-pink-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-pink-400 mt-2">点击相机更换头像</p>
            </div>

            {/* 名字 */}
            <div className="mb-4">
              <label className="block text-sm text-pink-600 mb-2">昵称</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入昵称"
                />
                <button
                  onClick={() => save("name", name)}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? "..." : "保存"}
                </button>
              </div>
            </div>

            {/* 生日 */}
            <div className="mb-4">
              <label className="block text-sm text-pink-600 mb-2">生日</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
                <button
                  onClick={() => save("birthday", birthday)}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? "..." : "保存"}
                </button>
              </div>
              {birthday && (
                <p className="text-xs text-pink-400 mt-2">
                  年龄：{getAge(birthday)} 岁
                </p>
              )}
            </div>

            {/* 在一起日期 */}
            <div>
              <label className="block text-sm text-pink-600 mb-2">💕 我们在一起的日子</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 rounded-xl border-2 border-pink-200 px-4 py-2.5 text-pink-900 focus:border-pink-400 focus:outline-none focus:ring-4 focus:ring-pink-50 transition-all bg-pink-50/30"
                  value={togetherSince}
                  onChange={(e) => save("togetherSince", e.target.value)}
                />
              </div>
              {togetherSince && (
                <p className="text-xs text-pink-400 mt-2">
                  已经在一起 {getTogetherDays(togetherSince)} 天啦～
                </p>
              )}
            </div>

            {message && (
              <div className="mt-4 text-center text-sm text-pink-500">{message}</div>
            )}
          </div>
        </div>

        {/* 对方资料卡片 */}
        {partner && (
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-100 to-rose-100 rounded-3xl blur opacity-30" />
            <div className="relative rounded-2xl bg-white/80 border-2 border-pink-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💕</span>
                <span className="font-semibold text-pink-800">另一半</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-pink-200 bg-pink-50">
                  {partner.avatar ? (
                    <Image
                      src={partner.avatar}
                      alt="partner avatar"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {partner.role === "A" ? "👦" : "👧"}
                    </div>
                  )}
                </div>
              <div className="flex-1">
                  <p className="font-medium text-pink-800">
                    {partner.name || "还没有设置昵称"}
                    {partner.nickname && (
                      <span className="text-pink-500">（{partner.nickname}）</span>
                    )}
                  </p>
                  {partner.birthday && (
                    <p className="text-sm text-pink-500">
                      生日：{partner.birthday} · {getAge(partner.birthday)} 岁
                    </p>
                  )}
                  {!partner.birthday && (
                    <p className="text-sm text-pink-400">还没有设置生日</p>
                  )}
                  
                  {/* 给对象起备注名 */}
                  <div className="mt-3">
                    <input
                      className="w-full rounded-xl border-2 border-pink-200 px-3 py-1.5 text-sm text-pink-900 placeholder-pink-300 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-50 transition-all bg-pink-50/30"
                      value={partnerNickname}
                      onChange={(e) => setPartnerNickname(e.target.value)}
                      placeholder="给TA起个备注名..."
                    />
                    {saving && partnerNickname !== (partner?.nickname || "") && (
                      <p className="text-xs text-pink-400 mt-1">保存中...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
