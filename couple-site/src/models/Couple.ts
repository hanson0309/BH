import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ProfileSchema = new Schema({
  name: { type: String, default: "" },
  birthday: { type: Date, default: null },
  avatar: { type: String, default: "" }, // base64 encoded image
  nickname: { type: String, default: "" }, // 伴侣给起的昵称
}, { _id: false });

const CoupleSchema = new Schema(
  {
    inviteCode: { type: String, required: true, unique: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    memberProfiles: {
      A: { type: ProfileSchema, default: () => ({}) },
      B: { type: ProfileSchema, default: () => ({}) },
    },
    togetherSince: { type: Date, default: null }, // 在一起的日期
    anniversaries: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
      },
    ],
    countdownAnniversaries: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

export type Couple = InferSchemaType<typeof CoupleSchema>;

export const CoupleModel =
  (mongoose.models.Couple as mongoose.Model<Couple>) ||
  mongoose.model<Couple>("Couple", CoupleSchema);
