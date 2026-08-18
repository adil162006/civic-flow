import mongoose from 'mongoose';

// GeoJSON coordinates are stored in longitude, latitude order.
const locationSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  accuracy: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

locationSchema.index({ location: '2dsphere' });

export const Location = mongoose.models.Location || mongoose.model('Location', locationSchema);
