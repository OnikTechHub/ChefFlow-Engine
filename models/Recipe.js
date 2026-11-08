import mongoose from 'mongoose';

/**
 * Utility to generate URL-safe slugs
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Sub-schema for individual recipe ingredients
 */
const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
      maxlength: [100, 'Ingredient name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Ingredient amount is required'],
      min: [0.01, 'Ingredient amount must be greater than 0'],
    },
    unit: {
      type: String,
      required: [true, 'Measurement unit is required'],
      trim: true,
      maxlength: [30, 'Unit cannot exceed 30 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Ingredient notes cannot exceed 200 characters'],
      default: '',
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/**
 * Sub-schema for step-by-step preparation instructions
 */
const instructionStepSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: [true, 'Step number is required'],
      min: [1, 'Step number must be at least 1'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [120, 'Step title cannot exceed 120 characters'],
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Step description is required'],
      trim: true,
      maxlength: [1500, 'Step description cannot exceed 1500 characters'],
    },
    timerMinutes: {
      type: Number,
      default: null,
      min: [0, 'Timer minutes cannot be negative'],
    },
    tips: {
      type: String,
      trim: true,
      default: '',
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

/**
 * Sub-schema for nutritional breakdown per serving
 */
const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0, min: 0 },
    protein: { type: Number, default: 0, min: 0 }, // in grams
    carbohydrates: { type: Number, default: 0, min: 0 }, // in grams
    fat: { type: Number, default: 0, min: 0 }, // in grams
    fiber: { type: Number, default: 0, min: 0 }, // in grams
    sugar: { type: Number, default: 0, min: 0 }, // in grams
    sodium: { type: Number, default: 0, min: 0 }, // in mg
  },
  { _id: false }
);

/**
 * Main Recipe Schema
 */
const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Recipe title is required'],
      trim: true,
      minlength: [3, 'Recipe title must be at least 3 characters'],
      maxlength: [120, 'Recipe title cannot exceed 120 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Recipe description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    authorName: {
      type: String,
      trim: true,
      default: 'ChefFlow Culinary Team',
    },
    cuisine: {
      type: String,
      required: [true, 'Cuisine is required'],
      trim: true,
      maxlength: [60, 'Cuisine cannot exceed 60 characters'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Breakfast',
          'Lunch',
          'Dinner',
          'Dessert',
          'Appetizer',
          'Soup',
          'Salad',
          'Snack',
          'Beverage',
          'Baking',
          'Side Dish',
        ],
        message: '{VALUE} is not a valid recipe category',
      },
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Chef Special'],
      default: 'Medium',
      index: true,
    },
    prepTime: {
      type: Number,
      required: [true, 'Prep time is required'],
      min: [0, 'Prep time cannot be negative'],
    },
    cookTime: {
      type: Number,
      required: [true, 'Cook time is required'],
      min: [0, 'Cook time cannot be negative'],
    },
    totalTime: {
      type: Number,
      min: [0, 'Total time cannot be negative'],
    },
    servings: {
      type: Number,
      required: [true, 'Number of servings is required'],
      min: [1, 'Servings must be at least 1'],
      max: [100, 'Servings cannot exceed 100'],
    },
    dietaryInfo: [
      {
        type: String,
        trim: true,
        enum: [
          'Vegetarian',
          'Vegan',
          'Gluten-Free',
          'Dairy-Free',
          'Keto',
          'Paleo',
          'Nut-Free',
          'Halal',
          'Kosher',
          'Low-Carb',
          'Low-Sodium',
          'Pescatarian',
        ],
      },
    ],
    ingredients: {
      type: [ingredientSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A recipe must contain at least one ingredient',
      },
    },
    instructions: {
      type: [instructionStepSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A recipe must have at least one instruction step',
      },
    },
    nutrition: {
      type: nutritionSchema,
      default: () => ({}),
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
      default: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80',
    },
    galleryImages: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (v) => Math.round(v * 10) / 10,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-calculate totalTime and generate unique slug prior to validation and saving
recipeSchema.pre('validate', async function () {
  // Compute total time if prepTime and cookTime exist
  if (this.prepTime != null && this.cookTime != null) {
    this.totalTime = this.prepTime + this.cookTime;
  }

  // Generate unique slug if title is modified or slug is empty
  if (this.isModified('title') || !this.slug) {
    const baseSlug = generateSlug(this.title || 'recipe');
    let uniqueSlug = baseSlug;
    let counter = 1;

    // Check collision in database
    while (await mongoose.models.Recipe.findOne({ slug: uniqueSlug, _id: { $ne: this._id } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = uniqueSlug;
  }
});

// Full-text search index across key culinary fields
recipeSchema.index({
  title: 'text',
  description: 'text',
  cuisine: 'text',
  tags: 'text',
  'ingredients.name': 'text',
});

// Compound indexes for high-speed filtered queries
recipeSchema.index({ cuisine: 1, category: 1, status: 1 });
recipeSchema.index({ author: 1, createdAt: -1 });
recipeSchema.index({ status: 1, 'ratings.average': -1 });

export const Recipe = mongoose.model('Recipe', recipeSchema);

