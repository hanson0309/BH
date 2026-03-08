import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ImageSchema = new Schema(
  {
    contentType: { type: String, required: true },
    base64: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { _id: false }
);

const PostSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    authorRole: { type: String, required: true, enum: ["A", "B"] },
    text: { type: String, default: "" },
    images: { type: [ImageSchema], default: [] },
    likes: [{ type: String, enum: ["A", "B"], default: [] }],
  },
  { timestamps: true }
);

export type Post = InferSchemaType<typeof PostSchema>;

export const PostModel =
  (mongoose.models.PostV2 as mongoose.Model<Post>) ||
  mongoose.model<Post>("PostV2", PostSchema, "posts");
