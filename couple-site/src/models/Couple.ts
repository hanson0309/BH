import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CoupleSchema = new Schema(
  {
    inviteCode: { type: String, required: true, unique: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
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
