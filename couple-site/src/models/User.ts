import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", default: null },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof UserSchema>;

export const UserModel =
  (mongoose.models.User as mongoose.Model<User>) || mongoose.model<User>("User", UserSchema);
