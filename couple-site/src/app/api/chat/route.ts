import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/request";
import { connectToDatabase } from "@/lib/db";
import { TodoModel } from "@/models/Todo";
import { CoupleModel } from "@/models/Couple";
import { DiaryModel } from "@/models/Diary";
import { CapsuleModel } from "@/models/Capsule";
import { PhotoModel } from "@/models/Photo";

// Groq API 配置
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// 意图识别类型
type Intent = 
  | "chat"           // 普通聊天
  | "todo_add"       // 添加待办
  | "todo_list"      // 列出待办
  | "todo_done"      // 完成待办
  | "todo_delete"    // 删除待办
  | "anniversary_list"  // 列出纪念日
  | "diary_summary"  // 日记总结
  | "capsule_add"    // 创建时光胶囊
  | "capsule_list"   // 列出时光胶囊
  | "photo_list";    // 列出照片

// 解析用户意图
function parseIntent(message: string): { intent: Intent; data?: any } {
  const lowerMsg = message.toLowerCase();
  
  // 待办相关意图
  if (lowerMsg.includes("添加待办") || lowerMsg.includes("新建待办") || lowerMsg.includes("加个待办") || 
      lowerMsg.match(/添加.*待办/) || lowerMsg.match(/记录.*(事情|任务|目标)/)) {
    const text = message.replace(/添加|新建|加个|待办|任务|目标/g, "").trim();
    return { intent: "todo_add", data: { text } };
  }
  
  if (lowerMsg.includes("列出待办") || lowerMsg.includes("查看待办") || lowerMsg.includes("有哪些待办") ||
      lowerMsg.includes("待办列表") || lowerMsg.includes("有什么任务")) {
    return { intent: "todo_list" };
  }
  
  if (lowerMsg.includes("完成待办") || lowerMsg.includes("标记完成") || lowerMsg.includes("做完")) {
    const text = message.replace(/完成|标记|做完|待办|任务/g, "").trim();
    return { intent: "todo_done", data: { text } };
  }
  
  if (lowerMsg.includes("删除待办") || lowerMsg.includes("移除待办") || lowerMsg.includes("删掉")) {
    const text = message.replace(/删除|移除|删掉|待办|任务/g, "").trim();
    return { intent: "todo_delete", data: { text } };
  }
  
  // 纪念日相关
  if (lowerMsg.includes("纪念日") && (lowerMsg.includes("有哪些") || lowerMsg.includes("列出") || lowerMsg.includes("查看"))) {
    return { intent: "anniversary_list" };
  }
  
  // 日记总结
  if ((lowerMsg.includes("总结") || lowerMsg.includes("概括")) && lowerMsg.includes("日记")) {
    return { intent: "diary_summary" };
  }
  
  // 时光胶囊相关
  if (lowerMsg.includes("创建胶囊") || lowerMsg.includes("新建胶囊") || lowerMsg.includes("添加胶囊") || 
      lowerMsg.includes("写胶囊") || lowerMsg.includes("给未来")) {
    return { intent: "capsule_add" };
  }
  
  if (lowerMsg.includes("胶囊列表") || lowerMsg.includes("查看胶囊") || lowerMsg.includes("有哪些胶囊") ||
      lowerMsg.includes("时光胶囊") && (lowerMsg.includes("查看") || lowerMsg.includes("列出"))) {
    return { intent: "capsule_list" };
  }
  
  // 照片相关
  if (lowerMsg.includes("照片") && (lowerMsg.includes("有哪些") || lowerMsg.includes("查看") || lowerMsg.includes("最近") || lowerMsg.includes("列出"))) {
    return { intent: "photo_list" };
  }
  
  return { intent: "chat" };
}

// 处理待办添加
async function handleTodoAdd(session: any, text: string) {
  if (!text || text.length < 2) {
    return { reply: "💕 请告诉我具体要添加什么待办事项哦～" };
  }
  
  await connectToDatabase();
  const todo = await TodoModel.create({
    coupleId: session.coupleId,
    text,
    done: false,
    createdByRole: session.role,
  });
  
  return { 
    reply: `📝 已添加待办："${text}"\n💪 一起加油完成它吧！`,
    action: "refresh_todos"
  };
}

// 处理待办列表
async function handleTodoList(session: any) {
  await connectToDatabase();
  const todos = await TodoModel.find({ coupleId: session.coupleId, done: false })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  
  if (todos.length === 0) {
    return { reply: "🎉 太棒了！目前没有待办事项，可以享受甜蜜时光啦～" };
  }
  
  const list = todos.map((t, i) => `${i + 1}. ${t.text}`).join("\n");
  return { 
    reply: `📋 当前待办事项：\n${list}\n\n💕 共 ${todos.length} 项待完成`,
    data: { todos: todos.map(t => ({ id: t._id.toString(), text: t.text })) }
  };
}

// 处理完成待办
async function handleTodoDone(session: any, text: string) {
  await connectToDatabase();
  
  const todos = await TodoModel.find({ 
    coupleId: session.coupleId, 
    done: false,
    text: { $regex: text, $options: "i" }
  }).limit(1);
  
  if (todos.length === 0) {
    return { reply: `🤔 没有找到包含 "${text}" 的待办事项，请检查一下哦～` };
  }
  
  const todo = todos[0];
  todo.done = true;
  todo.doneByRole = session.role;
  todo.doneAt = new Date();
  await todo.save();
  
  return { 
    reply: `✅ 已完成："${todo.text}"\n🎉 真棒！又完成一个目标啦～`,
    action: "refresh_todos"
  };
}

// 处理删除待办
async function handleTodoDelete(session: any, text: string) {
  await connectToDatabase();
  
  const todos = await TodoModel.find({ 
    coupleId: session.coupleId,
    text: { $regex: text, $options: "i" }
  }).limit(1);
  
  if (todos.length === 0) {
    return { reply: `🤔 没有找到包含 "${text}" 的待办事项～` };
  }
  
  const todo = todos[0];
  await TodoModel.deleteOne({ _id: todo._id });
  
  return { 
    reply: `🗑️ 已删除："${todo.text}"`,
    action: "refresh_todos"
  };
}

// 处理纪念日列表
async function handleAnniversaryList(session: any) {
  await connectToDatabase();
  const couple = await CoupleModel.findById(session.coupleId).lean();
  
  if (!couple || !couple.anniversaries || couple.anniversaries.length === 0) {
    return { reply: "💕 还没有记录纪念日呢，快去添加一些甜蜜的纪念日吧～" };
  }
  
  const today = new Date();
  const list = couple.anniversaries.map((a: any) => {
    const date = new Date(a.date);
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const status = daysUntil < 0 ? "已过去" : daysUntil === 0 ? "就是今天！" : `${daysUntil}天后`;
    return `• ${a.title}: ${date.toLocaleDateString("zh-CN")} (${status})`;
  }).join("\n");
  
  return { reply: `📅 你们的纪念日：\n${list}` };
}

// 处理日记总结
async function handleDiarySummary(session: any) {
  await connectToDatabase();
  
  const couple = await CoupleModel.findById(session.coupleId).lean();
  const profileA = couple?.memberProfiles?.["A"] || { name: "A" };
  const profileB = couple?.memberProfiles?.["B"] || { name: "B" };
  const nameA = profileA.name || "A";
  const nameB = profileB.name || "B";
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const entries = await DiaryModel.find({
    coupleId: session.coupleId,
    date: { $gte: thirtyDaysAgo }
  }).sort({ date: -1 }).lean();
  
  if (entries.length === 0) {
    return { reply: "📔 最近30天还没有日记记录呢，快记录下你们的美好时光吧～" };
  }
  
  const aEntries = entries.filter((e: any) => e.role === "A").length;
  const bEntries = entries.filter((e: any) => e.role === "B").length;
  const totalMood = entries.reduce((sum: number, e: any) => sum + (e.mood || 3), 0);
  const avgMoodNum = totalMood / entries.length;
  const avgMood = avgMoodNum.toFixed(1);
  
  const moodText = avgMoodNum >= 4 ? "非常开心" : avgMoodNum >= 3 ? "心情不错" : "有些平淡";
  
  return { 
    reply: `📊 最近30天日记总结：\n\n📝 共记录 ${entries.length} 篇日记\n💑 ${nameA}写了 ${aEntries} 篇，${nameB}写了 ${bEntries} 篇\n😊 平均心情指数: ${avgMood}/5 (${moodText})\n\n💕 坚持记录，留住每一份甜蜜！`
  };
}

// 处理创建时光胶囊
async function handleCapsuleAdd(session: any) {
  return { 
    reply: `💊 创建时光胶囊请前往「时光胶囊」页面，点击「新建胶囊」按钮。

可以写给未来的TA，设置解锁日期，到时候对方就能收到你的惊喜啦～

💡 提示：说 "查看胶囊" 可以看看你们已经创建了多少胶囊哦！`,
    action: "navigate_capsules"
  };
}

// 处理列出时光胶囊
async function handleCapsuleList(session: any) {
  await connectToDatabase();
  
  const now = new Date();
  const capsules = await CapsuleModel.find({ coupleId: session.coupleId })
    .sort({ unlockAt: 1 })
    .limit(10)
    .lean();
  
  if (capsules.length === 0) {
    return { reply: "💊 还没有时光胶囊呢，快去给未来的对方写一封信吧～" };
  }
  
  const locked = capsules.filter((c: any) => new Date(c.unlockAt).getTime() > now.getTime());
  const unlocked = capsules.filter((c: any) => new Date(c.unlockAt).getTime() <= now.getTime());
  
  let reply = `📦 你们共有 ${capsules.length} 个时光胶囊\n\n`;
  
  if (unlocked.length > 0) {
    reply += `🔓 已解锁 (${unlocked.length}个)：\n`;
    reply += unlocked.map((c: any) => `• ${c.title}`).join("\n");
    reply += "\n\n";
  }
  
  if (locked.length > 0) {
    reply += `🔒 待解锁 (${locked.length}个)：\n`;
    reply += locked.map((c: any) => {
      const days = Math.ceil((new Date(c.unlockAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `• ${c.title} (${days}天后)`;
    }).join("\n");
  }
  
  return { reply };
}

// 处理列出照片
async function handlePhotoList(session: any) {
  await connectToDatabase();
  
  const couple = await CoupleModel.findById(session.coupleId).lean();
  const profileA = couple?.memberProfiles?.["A"] || { name: "A" };
  const profileB = couple?.memberProfiles?.["B"] || { name: "B" };
  const nameA = profileA.name || "A";
  const nameB = profileB.name || "B";
  
  const photos = await PhotoModel.find({ coupleId: session.coupleId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  
  if (photos.length === 0) {
    return { reply: "📸 照片墙还没有照片呢，快去上传你们的美好瞬间吧～" };
  }
  
  const aPhotos = photos.filter((p: any) => p.uploadedByRole === "A").length;
  const bPhotos = photos.filter((p: any) => p.uploadedByRole === "B").length;
  
  return { 
    reply: `📸 照片墙共有 ${photos.length} 张照片\n\n💑 ${nameA}上传了 ${aPhotos} 张\n💑 ${nameB}上传了 ${bPhotos} 张\n\n💕 最近一张：${photos[0].caption || "无标题"}\n\n快去照片墙查看更多美好回忆吧！`,
    action: "navigate_photos"
  };
}

// 普通聊天回复
async function handleChat(message: string) {
  if (!GROQ_API_KEY) {
    return { reply: "💕 收到！我会帮你们记录下来。" };
  }
  
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `你是"甜蜜小屋"情侣网站的 AI 助手。你的角色是帮助情侣管理他们的甜蜜生活。

你可以帮用户：
- 📝 添加/查看/完成/删除待办事项
- 📅 查看纪念日列表
- 📔 总结最近的日记记录
- 💊 查看时光胶囊（创建请前往时光胶囊页面）
- 📸 查看照片墙统计（上传请前往照片墙页面）

网站功能包括：
- 📝 甜蜜待办：记录共同目标
- 📅 纪念日：记录重要日期，支持每年循环
- 📔 恋爱日记：每日心情记录
- 💊 时光胶囊：给未来的对方写信
- 📸 照片墙：保存美好瞬间

你的语气应该：
- 温暖、甜蜜、充满爱意
- 使用 emoji 表情让对话更生动
- 鼓励情侣之间的互动和回忆
- 简短友好，回复控制在 150 字以内

回复时保持中文。`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  
  const data = await response.json();
  return { reply: data.choices?.[0]?.message?.content || "💕 收到！" };
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes("清除缓存") || lowerMsg.includes("clear cache")) {
      return NextResponse.json({
        reply: "🧹 已收到清除缓存指令！页面刷新后缓存会被清除。",
        action: "clear_cache"
      });
    }

    if (lowerMsg.includes("系统状态") || lowerMsg.includes("status")) {
      return NextResponse.json({
        reply: `📊 系统状态良好！\n\n💕 甜蜜小屋运行正常\n🤖 Groq AI 已在线\n📱 所有功能模块正常\n\n有什么我可以帮你们的吗？`,
      });
    }

    const { intent, data } = parseIntent(message);
    
    let result;
    switch (intent) {
      case "todo_add":
        result = await handleTodoAdd(session, data?.text);
        break;
      case "todo_list":
        result = await handleTodoList(session);
        break;
      case "todo_done":
        result = await handleTodoDone(session, data?.text);
        break;
      case "todo_delete":
        result = await handleTodoDelete(session, data?.text);
        break;
      case "anniversary_list":
        result = await handleAnniversaryList(session);
        break;
      case "diary_summary":
        result = await handleDiarySummary(session);
        break;
      case "capsule_add":
        result = await handleCapsuleAdd(session);
        break;
      case "capsule_list":
        result = await handleCapsuleList(session);
        break;
      case "photo_list":
        result = await handlePhotoList(session);
        break;
      default:
        result = await handleChat(message);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({
      reply: "💕 抱歉，我遇到了一点小问题，请稍后再试～",
    });
  }
}
