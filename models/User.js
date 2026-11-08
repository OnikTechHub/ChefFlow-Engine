import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'chef', 'admin'],
      default: 'chef',
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'expired', 'suspended'],
      default: 'active',
      index: true,
    },
    membershipTier: {
      type: String,
      enum: ['free', 'pro_chef', 'master_chef', 'enterprise'],
      default: 'pro_chef',
    },
    membershipExpiresAt: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    specialties: [{ type: String, trim: true }],
    savedRecipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has an active, non-expired membership
userSchema.methods.hasActiveMembership = function () {
  if (this.membershipStatus !== 'active') {
    return false;
  }
  if (this.membershipExpiresAt && new Date() > new Date(this.membershipExpiresAt)) {
    return false;
  }
  return true;
};

export const User = mongoose.model('User', userSchema);
