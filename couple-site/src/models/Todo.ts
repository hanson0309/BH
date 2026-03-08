import mongoose, { Schema, type InferSchemaType } from "mongoose";

const TodoSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    createdByRole: { type: String, required: true, enum: ["A", "B"] },
    doneByRole: { type: String, enum: ["A", "B"], default: null },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type Todo = InferSchemaType<typeof TodoSchema>;

export const TodoModel =
  (mongoose.models.TodoV1 as mongoose.Model<Todo>) ||
  mongoose.model<Todo>("TodoV1", TodoSchema, "todos");
