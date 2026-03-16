import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProfileSchema = new Schema({
  name: { type: String, default: "" },
  birthday: { type: Date, default: null },
  avatar: { type: String, default: "" }, // base64 encoded image
  nickname: { type: String, default: "" }, // 伴侣给起的昵称
}, { _id: false });

const AnniversarySchema = new Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  recurring: { type: Boolean, default: false },
}, { _id: false });

const CoupleSchema = new Schema(
  {
    inviteCode: { type: String, required: true, unique: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    memberProfiles: {
      A: { type: ProfileSchema, default: () => ({}) },
      B: { type: ProfileSchema, default: () => ({}) },
    },
    togetherSince: { type: Date, default: null },
    anniversaries: { type: [AnniversarySchema], default: [] },
    countdownAnniversaries: { type: [AnniversarySchema], default: [] },
    // 在线状态追踪
    presenceA: { type: Date, default: null },
    presenceB: { type: Date, default: null },
  },
  { timestamps: true, strict: false }
);

export type Couple = InferSchemaType<typeof CoupleSchema>;

// 删除可能缓存的旧模型，强制重新编译
delete mongoose.models.Couple;

export const CoupleModel =
  mongoose.model<Couple>("Couple", CoupleSchema);
