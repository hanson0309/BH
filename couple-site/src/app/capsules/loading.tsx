export default function Loading() {
  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区骨架 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-200 animate-pulse" />
          <div>
            <div className="h-6 w-24 bg-pink-200 rounded mb-1 animate-pulse" />
            <div className="h-3 w-20 bg-pink-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 创建卡片骨架 */}
        <div className="rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full bg-pink-200 animate-pulse" />
            <div className="h-4 w-28 bg-pink-200 rounded animate-pulse" />
          </div>
          <div className="h-10 bg-pink-200 rounded-xl mb-3 animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
            <div className="h-10 bg-pink-200 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* 胶囊列表骨架 */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-pink-100 p-5 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-200 animate-pulse" />
                  <div>
                    <div className="h-4 w-32 bg-pink-200 rounded mb-2 animate-pulse" />
                    <div className="h-3 w-24 bg-pink-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-pink-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
