import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PhotoSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    uploadedByRole: { type: String, required: true, enum: ["A", "B"] },
    caption: { type: String, default: "" },
    tags: { type: [String], default: [] },
    takenAt: { type: Date, default: null },
    contentType: { type: String, required: true },
    base64: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { timestamps: true }
);

export type Photo = InferSchemaType<typeof PhotoSchema>;

export const PhotoModel =
  (mongoose.models.PhotoV1 as mongoose.Model<Photo>) ||
  mongoose.model<Photo>("PhotoV1", PhotoSchema, "photos");
