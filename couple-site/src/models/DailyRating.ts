import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DailyRatingSchema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
    date: { type: Date, required: true, index: true },
    fromRole: { type: String, required: true, enum: ["A", "B"], index: true },
    toRole: { type: String, required: true, enum: ["A", "B"] },
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

DailyRatingSchema.index({ coupleId: 1, date: 1, fromRole: 1 }, { unique: true });

export type DailyRating = InferSchemaType<typeof DailyRatingSchema>;

export const DailyRatingModel =
  (mongoose.models.DailyRatingV1 as mongoose.Model<DailyRating>) ||
  mongoose.model<DailyRating>("DailyRatingV1", DailyRatingSchema, "daily_ratings");
