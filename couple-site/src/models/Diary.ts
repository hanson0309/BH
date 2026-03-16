import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DiarySchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    date: { type: Date, required: true, index: true }, // 日记日期（精确到天）
    content: { type: String, required: true }, // 日记内容
    createdByRole: { type: String, required: true, enum: ["A", "B"] }, // 谁写的
    mood: { type: String, default: "" }, // 心情表情（可选）
  },
  { timestamps: true }
);

// 复合唯一索引：一对情侣每天只能有一篇日记
DiarySchema.index({ coupleId: 1, date: 1 }, { unique: true });

export type Diary = InferSchemaType<typeof DiarySchema>;

export const DiaryModel =
  (mongoose.models.DiaryV1 as mongoose.Model<Diary>) ||
  mongoose.model<Diary>("DiaryV1", DiarySchema, "diaries");
