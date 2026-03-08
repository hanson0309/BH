import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { connectToDatabase } from "@/lib/db";
import { PostModel } from "@/models/Post";
import { getSessionFromCookies } from "@/lib/request";

export default async function Home() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/enter");

  await connectToDatabase();
  const posts = await PostModel.find({ coupleId: session.coupleId }).sort({ _id: -1 }).limit(20).lean();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">你们的动态</h1>
          <form
            action={async () => {
              "use server";
              const cookieStore = await cookies();
              cookieStore.set("couple_id", "", { httpOnly: true, path: "/", maxAge: 0 });
              cookieStore.set("role", "", { httpOnly: true, path: "/", maxAge: 0 });
              revalidatePath("/");
              redirect("/enter");
            }}
          >
            <button className="text-sm text-zinc-600 hover:text-zinc-900" type="submit">
              退出
            </button>
          </form>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <a
            className="rounded-2xl border bg-white p-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/anniversaries"
          >
            纪念日
          </a>
          <a
            className="rounded-2xl border bg-white p-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/todos"
          >
            待办
          </a>
          <a
            className="rounded-2xl border bg-white p-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/capsules"
          >
            胶囊
          </a>
          <a
            className="rounded-2xl border bg-white p-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/photos"
          >
            相册
          </a>
        </div>

        <form
          className="mt-4 rounded-2xl border bg-white p-4"
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
          <textarea
            name="text"
            className="w-full resize-none rounded-xl border px-3 py-2"
            placeholder="今天想说点什么..."
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <button className="rounded-xl bg-black px-3 py-2 text-white" type="submit">
              发布
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {posts.map((p) => (
            <div key={p._id.toString()} className="rounded-2xl border bg-white p-4">
              <div className="text-xs font-medium text-zinc-500">{p.authorRole === session.role ? "我" : "对方"}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{p.text}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {new Date(p.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
          ))}
          {posts.length === 0 && <div className="text-sm text-zinc-600">还没有动态，发第一条吧。</div>}
        </div>
      </div>
    </div>
  );
}
