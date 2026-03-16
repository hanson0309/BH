// 全局数据缓存 - 跨页面共享
// 使用 globalThis 确保在浏览器和 Node.js 环境中都能工作

type ProfileData = { A: unknown; B: unknown };
type CoupleData = { togetherSince: string | null };

export const globalCache = {
  // 数据缓存
  anniversaries: null as unknown[] | null,
  todos: null as unknown[] | null,
  capsules: null as unknown[] | null,
  photos: null as unknown[] | null,
  posts: null as unknown[] | null,
  diary: new Map<string, unknown[]>(),
  profiles: null as ProfileData | null,
  coupleData: null as CoupleData | null,
  
  // 进行中的请求（防止重复 fetch）
  _pending: {
    profiles: null as Promise<ProfileData> | null,
    coupleData: null as Promise<CoupleData> | null,
  } as Record<string, Promise<unknown> | null>,
};

// 通用数据获取函数（带缓存和去重）
export async function fetchWithCache<T>(
  key: "profiles" | "coupleData" | "anniversaries" | "todos" | "capsules" | "photos" | "posts",
  fetcher: () => Promise<T>,
  force = false
): Promise<T | null> {
  // 1. 检查缓存
  if (!force && globalCache[key]) {
    return globalCache[key] as T;
  }
  
  // 2. 检查是否有进行中的请求，有则等待
  if (globalCache._pending[key]) {
    return globalCache._pending[key] as Promise<T>;
  }
  
  // 3. 发起新请求并记录
  const promise = fetcher().then((data) => {
    (globalCache[key] as unknown) = data;
    globalCache._pending[key] = null;
    return data;
  }).catch((err) => {
    globalCache._pending[key] = null;
    throw err;
  });
  
  globalCache._pending[key] = promise as Promise<unknown>;
  return promise;
}

// 获取用户资料（自动处理缓存和重复请求）
export async function fetchProfiles(force = false): Promise<ProfileData | null> {
  return fetchWithCache("profiles", async () => {
    const res = await fetch("/api/profile");
    if (!res.ok) throw new Error("Failed to fetch profile");
    const data = await res.json();
    return {
      A: data.me.role === "A" ? data.me : data.partner,
      B: data.me.role === "B" ? data.me : data.partner,
    };
  }, force);
}

// 清除指定缓存
export function clearCache(key: keyof typeof globalCache) {
  if (key === "diary") {
    globalCache.diary.clear();
  } else {
    (globalCache[key] as unknown) = null;
  }
}

// 清除所有缓存
export function clearAllCache() {
  globalCache.anniversaries = null;
  globalCache.todos = null;
  globalCache.capsules = null;
  globalCache.photos = null;
  globalCache.posts = null;
  globalCache.diary.clear();
  globalCache.profiles = null;
  globalCache.coupleData = null;
}
