import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Image from "next/image";
import TogetherTimer from "@/components/TogetherTimer";

import { connectToDatabase } from "@/lib/db";
import { PostModel } from "@/models/Post";
import { CoupleModel } from "@/models/Couple";
import { getSessionFromCookies } from "@/lib/request";

export default async function Home() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/enter");

  await connectToDatabase();
  const posts = await PostModel.find({ coupleId: session.coupleId }).sort({ _id: -1 }).limit(20).lean();
  
  // 获取个人资料
  const couple = await CoupleModel.findById(session.coupleId).lean();
  const myProfile = couple?.memberProfiles?.[session.role];
  
  // 获取在一起日期
  const togetherSince = couple?.togetherSince;
  
  // 获取双方资料用于帖子显示
  const profileA = couple?.memberProfiles?.["A"];
  const profileB = couple?.memberProfiles?.["B"];
  
  // 获取昵称：当前查看者(我)给作者起的备注名
  // 规则：每个成员 profile 里的 nickname 字段表示「这个人给对方起的备注」
  // 所以：当帖子作者是 A 时，要显示 B.profile.nickname（B 给 A 起的备注）；作者是 B 时，显示 A.profile.nickname。
  const getNickname = (authorRole: "A" | "B") => {
    const viewerRole = session.role;
    const viewerProfile = viewerRole === "A" ? profileA : profileB;

    // 只在作者不是自己时显示（自己帖子不需要显示自己给自己的备注）
    if (authorRole === viewerRole) return "";

    return viewerProfile?.nickname || "";
  };
  
  const getAuthorName = (role: "A" | "B") => {
    const profile = role === "A" ? profileA : profileB;
    return profile?.name || (role === "A" ? "👦 A" : "👧 B");
  };
  const getAuthorAvatar = (role: "A" | "B") => {
    const profile = role === "A" ? profileA : profileB;
    return profile?.avatar || null;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 我们在一起 - 实时动态计时器 */}
        {togetherSince && (
          <div className="mb-8 flex justify-center">
            <div className="text-center">
              <div className="text-2xl mb-3">💕</div>
              <div className="text-sm text-pink-600 font-medium mb-3">我们在一起</div>
              <TogetherTimer since={togetherSince.toISOString().split("T")[0]} />
            </div>
          </div>
        )}

        {/* 发帖卡片 */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-200 to-cyan-200 rounded-3xl blur opacity-50" />
          <form
            className="relative rounded-2xl bg-white border-2 border-sky-100 p-5 shadow-sm"
            action={async (formData) => {
              "use server";
              const text = String(formData.get("text") || "");
              if (text.length > 2000) throw new Error("text_too_long");

              await connectToDatabase();
              const s = await getSessionFromCookies();
              if (!s) redirect("/enter");

              await PostModel.create({
                coupleId: s.coupleId,
                authorRole: s.role,
                text,
                images: [],
              });
              revalidatePath("/");
              redirect("/");
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {myProfile?.avatar ? (
                <Image
                  src={myProfile.avatar}
                  alt="me"
                  width={32}
                  height={32}
                  className={`w-8 h-8 rounded-full object-cover border-2 ${
                    session.role === "A" 
                      ? "border-blue-400" 
                      : "border-pink-400"
                  }`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  session.role === "A" 
                    ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white" 
                    : "bg-gradient-to-br from-sky-400 to-cyan-500 text-white"
                }`}>
                  {session.role}
                </div>
              )}
              <div>
                <span className="text-sm text-sky-900 font-medium">{myProfile?.name || (session.role === "A" ? "👦 A" : "👧 B")}</span>
                <span className="text-xs text-sky-400 block">分享此刻的心情...</span>
              </div>
            </div>
            <textarea
              name="text"
              className="w-full resize-none rounded-xl border-2 border-sky-100 px-4 py-3 text-sky-900 placeholder-sky-300 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-50 transition-all bg-sky-50/30"
              placeholder="今天想对TA说什么甜蜜的话呢？✨"
              rows={3}
            />
            <div className="mt-3 flex justify-end">
              <button 
                className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-white font-semibold shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 hover:scale-[1.02] active:scale-[0.98] transition-all" 
                type="submit"
              >
                <span className="flex items-center gap-1.5">
                  <span>💌</span>
                  发布
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* 动态流 */}
        <div className="space-y-4">
          {posts.map((p) => (
            <div 
              key={p._id.toString()} 
              className="relative rounded-2xl bg-white border-2 border-sky-100 p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {getAuthorAvatar(p.authorRole as "A" | "B") ? (
                  <Image
                    src={getAuthorAvatar(p.authorRole as "A" | "B")!}
                    alt={p.authorRole}
                    width={40}
                    height={40}
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
