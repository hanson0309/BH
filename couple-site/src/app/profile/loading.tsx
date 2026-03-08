export default function Loading() {
  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区骨架 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-200 animate-pulse" />
          <div className="h-6 w-24 bg-pink-200 rounded animate-pulse" />
        </div>

        {/* 卡片骨架 */}
        <div className="rounded-2xl bg-white border-2 border-pink-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-full bg-pink-200 animate-pulse" />
            <div className="h-5 w-20 bg-pink-200 rounded animate-pulse" />
          </div>

          {/* 头像骨架 */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-pink-200 animate-pulse mb-2" />
            <div className="h-4 w-32 bg-pink-200 rounded animate-pulse" />
          </div>

          {/* 输入框骨架 */}
          <div className="space-y-4">
            <div>
              <div className="h-4 w-12 bg-pink-200 rounded mb-2 animate-pulse" />
              <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-12 bg-pink-200 rounded mb-2 animate-pulse" />
              <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
