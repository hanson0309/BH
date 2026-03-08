import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CapsuleSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    unlockAt: { type: Date, required: true, index: true },
    createdByRole: { type: String, required: true, enum: ["A", "B"] },
  },
  { timestamps: true }
);

export type Capsule = InferSchemaType<typeof CapsuleSchema>;

export const CapsuleModel =
  (mongoose.models.CapsuleV1 as mongoose.Model<Capsule>) ||
  mongoose.model<Capsule>("CapsuleV1", CapsuleSchema, "capsules");
