export default function Loading() {
  return (
    <div className="min-h-screen py-8 pt-16">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* 标题区骨架 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pink-200 animate-pulse" />
          <div className="h-6 w-24 bg-pink-200 rounded animate-pulse" />
        </div>

        {/* 上传卡片骨架 */}
        <div className="rounded-2xl bg-white border-2 border-pink-100 p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full bg-pink-200 animate-pulse" />
            <div className="h-4 w-24 bg-pink-200 rounded animate-pulse" />
          </div>
          <div className="h-24 bg-pink-200 rounded-xl animate-pulse" />
        </div>

        {/* 照片网格骨架 */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-pink-200 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
