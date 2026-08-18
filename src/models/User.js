import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      default: 'Citizen User',
    },
    email: {
      type: String,
      sparse: true,
      index: true,
    },
    password: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      sparse: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'admin', 'department_officer'],
      default: 'citizen',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model('User', userSchema);
