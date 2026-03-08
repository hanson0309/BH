import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/request";
import { TodoModel } from "@/models/Todo";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await connectToDatabase();
  const todos = await TodoModel.find({ coupleId: session.coupleId }).sort({ _id: -1 }).limit(200).lean();

  return NextResponse.json({
    todos: todos.map((t) => ({
      id: t._id.toString(),
      text: t.text,
      done: t.done,
      createdByRole: t.createdByRole,
      doneByRole: t.doneByRole ?? null,
      doneAt: t.doneAt ?? null,
      createdAt: t.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (text.length > 200) return NextResponse.json({ error: "text_too_long" }, { status: 400 });

  await connectToDatabase();
  const todo = await TodoModel.create({
    coupleId: session.coupleId,
    text,
    done: false,
    createdByRole: session.role,
  });

  return NextResponse.json({ id: todo._id.toString() });
}

export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { id?: string; done?: boolean };
  const id = body.id;
  const done = body.done;
  if (!id || typeof done !== "boolean") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  await connectToDatabase();
  const todo = await TodoModel.findOne({ _id: id, coupleId: session.coupleId });
  if (!todo) return NextResponse.json({ error: "not_found" }, { status: 404 });

  todo.done = done;
  if (done) {
    todo.doneByRole = session.role;
    todo.doneAt = new Date();
  } else {
    todo.doneByRole = null;
    todo.doneAt = null;
  }
  await todo.save();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await connectToDatabase();
  const result = await TodoModel.deleteOne({ _id: id, coupleId: session.coupleId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
