"use client";



import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import TogetherTimer from "@/components/TogetherTimer";

import { globalCache, clearCache } from "@/lib/globalCache";

import { apiFetchJson } from "@/lib/apiClient";



type Profile = {

  role: "A" | "B";

  name: string;

  birthday: string | null;

  avatar: string;

  nickname: string;

};



type Post = {

  id: string;

  coupleId: string;

  authorRole: "A" | "B";

  text: string;

  images: string[];

  createdAt: string;

};



type Anniversary = {

  id: string;

  title: string;

  date: string;

  recurring: boolean;

};



function daysUntilAnniversary(dateStr: string, recurring: boolean = false): number {

  const now = new Date();

  const originalDate = new Date(dateStr);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  

  if (recurring) {

    const thisYearDate = new Date(now.getFullYear(), originalDate.getMonth(), originalDate.getDate());

    let targetDate = thisYearDate;

    if (thisYearDate.getTime() < startOfToday.getTime()) {

      targetDate = new Date(now.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());

    }

    const diff = targetDate.getTime() - startOfToday.getTime();

    return Math.round(diff / (1000 * 60 * 60 * 24));

  }

  

  const startOfTarget = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());

  const diff = startOfTarget.getTime() - startOfToday.getTime();

  return Math.round(diff / (1000 * 60 * 60 * 24));

}



export default function Home() {

  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);

  const [profiles, setProfiles] = useState<{ A: Profile; B: Profile } | null>(null);

  const [myRole, setMyRole] = useState<"A" | "B">("A");

  const [togetherSince, setTogetherSince] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);



  async function loadAnniversaries(force = false) {

    if (!force && globalCache.anniversaries) {

      setAnniversaries(globalCache.anniversaries as Anniversary[]);

      return;

    }

    try {

      const data = await apiFetchJson<{ anniversaries: Anniversary[] }>(
        "/api/anniversaries"
      );

      globalCache.anniversaries = data.anniversaries;

      setAnniversaries(data.anniversaries);

    } catch {

      // 忽略错误

    }

  }



  // 预加载照片数据（用户访问照片页时更快）

  async function preloadPhotos() {

    if (globalCache.photos) return; // 已有缓存不重复加载

    try {

      const data = await apiFetchJson<{ photos: unknown[] }>("/api/photos");

      globalCache.photos = data.photos;

    } catch {

      // 预加载失败不影响首页

    }

  }



  async function loadPosts(force = false) {

    if (!force && globalCache.posts) {

      setPosts(globalCache.posts as Post[]);

      return;

    }

    try {

      const data = await apiFetchJson<{ posts: Post[] }>("/api/posts");

      globalCache.posts = data.posts;

      setPosts(data.posts);

    } catch (e) {

      const err = e as Error & { status?: number };

      if (err?.status === 401) {

        router.push("/enter");

      }

      // 忽略错误

    }

  }



  async function loadProfile(force = false) {

    if (!force && globalCache.profiles) {

      setProfiles(globalCache.profiles as { A: Profile; B: Profile });

      const coupleData = globalCache.coupleData as { togetherSince: string | null } | undefined;

      if (coupleData) {

        setTogetherSince(coupleData.togetherSince);

      }

      return;

    }

    try {

      const data = await apiFetchJson<{
        me: Profile;
        partner: Profile;
        togetherSince: string | null;
      }>("/api/profile");

      const profiles = {

        A: data.me.role === "A" ? data.me : data.partner,

        B: data.me.role === "B" ? data.me : data.partner

      };

      globalCache.profiles = profiles;

      globalCache.coupleData = { togetherSince: data.togetherSince };

      setProfiles(profiles);

      setMyRole(data.me.role);

      setTogetherSince(data.togetherSince);

    } catch {

      // 忽略错误

    }

  }



  const initialized = useRef(false);



  useEffect(() => {

    if (initialized.current) return;

    initialized.current = true;

    setLoading(true);

    Promise.all([

      loadPosts(),

      loadProfile(),

      loadAnniversaries(),

      preloadPhotos() // 预加载照片数据

    ]).finally(() => setLoading(false));

  }, []);



  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault();

    if (!text.trim() || submitting) return;

    

    setSubmitting(true);

    try {

      await apiFetchJson<unknown>("/api/posts", {

        method: "POST",

        headers: { "content-type": "application/json" },

        body: JSON.stringify({ text: text.trim() }),

      });

      

      setText("");

      clearCache("posts");

      await loadPosts(true);

    } catch (e) {

      const msg = e instanceof Error ? e.message : "发布失败，请重试";

      alert(msg || "发布失败，请重试");

    } finally {

      setSubmitting(false);

    }

  }



  const myProfile = profiles?.[myRole];



  const getNickname = (authorRole: "A" | "B") => {

    if (!profiles) return "";

    if (myRole === "A" && authorRole === "B") return profiles.B?.nickname || "";

    if (myRole === "B" && authorRole === "A") return profiles.A?.nickname || "";

    return "";

  };

  

  const getAuthorName = (role: "A" | "B") => {

    const profile = profiles?.[role];

    return profile?.name || (role === "A" ? "👦 A" : "👧 B");

  };

  

  const getAuthorAvatar = (role: "A" | "B") => {

    return profiles?.[role]?.avatar || null;

  };



  return (

    <div className="min-h-screen py-8">

      <div className="mx-auto w-full max-w-2xl px-4">

        {togetherSince && (

          <div className="mb-8 flex justify-center">

            <div className="text-center">

              <div className="text-2xl mb-3">💕</div>

              <div className="text-sm text-pink-600 font-medium mb-3">我们在一起</div>

              <TogetherTimer since={togetherSince} />

            </div>

          </div>

        )}



        {(() => {

          const upcoming = anniversaries

            .map(a => ({ ...a, days: daysUntilAnniversary(a.date, a.recurring) }))

            .filter(a => a.days >= 0 && a.days <= 7)

            .sort((a, b) => a.days - b.days);

          

          if (upcoming.length === 0) return null;

          

          return (

            <div className="mb-6 space-y-3">

              {upcoming.map(a => (

                <div 

                  key={a.id}

                  className={`rounded-xl border-2 p-4 flex items-center justify-between ${

                    a.days === 0 

                      ? "bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200" 

                      : "bg-white border-pink-100"

                  }`}

                >

                  <div className="flex items-center gap-3">

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${

                      a.days === 0 ? "bg-rose-100" : "bg-pink-100"

                    }`}>

                      {a.days === 0 ? "🎉" : "📅"}

                    </div>

                    <div>

                      <div className={`font-medium ${a.days === 0 ? "text-rose-700" : "text-pink-700"}`}>

                        {a.title}

                      </div>

                      <div className="text-xs text-pink-400">

                        {new Date(a.date).toLocaleDateString("zh-CN", {

                          month: "short",

                          day: "numeric",

                        })}

                        {a.recurring && " · 每年重复"}

                      </div>

                    </div>

                  </div>

                  <div className="text-right">

                    <div className={`text-2xl font-bold ${

                      a.days === 0 ? "text-rose-500" : "text-pink-500"

                    }`}>

                      {a.days === 0 ? "今天" : `${a.days}天`}

                    </div>

                    <div className="text-xs text-pink-400">

                      {a.days === 0 ? "💕 记得庆祝" : "后到期"}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          );

        })()}



        <div className="relative mb-6">

          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-cyan-200 rounded-3xl blur opacity-50" />

          <form

            className="relative rounded-2xl bg-white border-2 border-sky-100 p-5 shadow-sm"

            onSubmit={handleSubmit}

          >

            <div className="flex items-center gap-2 mb-3">

              {myProfile?.avatar ? (
                // 使用普通 img 标签避免 Vercel Image 优化问题
                <img
                  src={myProfile.avatar}
                  alt="me"
                  className={`w-8 h-8 rounded-full object-cover border-2 ${
                    myRole === "A" 
                      ? "border-blue-400" 
                      : "border-pink-400"
                  }`}
                />
              ) : (

                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${

                  myRole === "A" 

                    ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white" 

                    : "bg-gradient-to-br from-sky-400 to-cyan-500 text-white"

                }`}>

                  {myRole}

                </div>

              )}

              <div>

                <span className="text-sm text-sky-900 font-medium">{myProfile?.name || (myRole === "A" ? "👦 A" : "👧 B")}</span>

                <span className="text-xs text-sky-400 block">分享此刻的心情...</span>

              </div>

            </div>

            <textarea

              value={text}

              onChange={(e) => setText(e.target.value)}

              className="w-full resize-none rounded-xl border-2 border-sky-100 px-4 py-3 text-sky-900 placeholder-sky-300 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-50 transition-all bg-sky-50/30"

              placeholder="今天想对TA说什么甜蜜的话呢？✨"

              rows={3}

              maxLength={2000}

            />

            <div className="mt-3 flex justify-end">

              <button 

                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60" 

                type="submit"

                disabled={submitting || !text.trim()}

              >

                <span className="flex items-center gap-1.5">

                  <span>💌</span>

                  {submitting ? "发布中..." : "发布"}

                </span>

              </button>

            </div>

          </form>

        </div>



        {loading && (

          <div className="text-center py-8">

            <div className="text-2xl mb-2">⏳</div>

            <p className="text-sky-500/80 text-sm">加载中...</p>

          </div>

        )}



        <div className="space-y-4">

          {posts.map((p) => (

            <div 

              key={p.id} 

              className="relative rounded-2xl bg-white border-2 border-sky-100 p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"

            >

              <div className="flex items-center gap-3 mb-3">

                {getAuthorAvatar(p.authorRole as "A" | "B") ? (
                  // 使用普通 img 标签避免 Vercel Image 优化问题
                  <img
                    src={getAuthorAvatar(p.authorRole as "A" | "B")!}
                    alt={p.authorRole}
                    className={`w-10 h-10 rounded-full object-cover border-2 ${
                      p.authorRole === "A" 
                        ? "border-blue-400" 
                        : "border-pink-400"
                    }`}
                  />
                ) : (

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${

                    p.authorRole === "A" 

                      ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white" 

                      : "bg-gradient-to-br from-pink-400 to-rose-500 text-white"

                  }`}>

                    {p.authorRole}

                  </div>

                )}

                <div>

                  <div className={`text-sm font-semibold ${

                    p.authorRole === "A" ? "text-blue-700" : "text-pink-700"

                  }`}>

                    {getAuthorName(p.authorRole as "A" | "B")}

                    {(() => {

                      const nickname = getNickname(p.authorRole as "A" | "B");

                      return nickname && (

                        <span className={p.authorRole === "A" ? "text-blue-500" : "text-pink-500"}>（{nickname}）</span>

                      );

                    })()}

                  </div>

                  <div className="text-xs text-sky-400">

                    {new Date(p.createdAt).toLocaleString("zh-CN", {

                      month: "short",

                      day: "numeric",

                      hour: "2-digit",

                      minute: "2-digit",

                    })}

                  </div>

                </div>

              </div>

              <div className="whitespace-pre-wrap text-sm text-sky-900/90 leading-relaxed pl-[52px]">

                {p.text}

              </div>

            </div>

          ))}

          

          {posts.length === 0 && (

            <div className="text-center py-12">

              <div className="text-4xl mb-3">✨</div>

              <p className="text-sky-500/80 text-sm">还没有动态，发第一条甜蜜留言吧～</p>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}

