import { z } from 'zod';

const ingredientValidationSchema = z.object({
  name: z.string({ required_error: 'Ingredient name is required' }).trim().min(1, 'Ingredient name cannot be empty').max(100),
  amount: z.number({ required_error: 'Ingredient amount is required' }).positive('Ingredient amount must be greater than 0'),
  unit: z.string({ required_error: 'Measurement unit is required' }).trim().min(1, 'Measurement unit cannot be empty').max(30),
  notes: z.string().trim().max(200).optional().default(''),
  isOptional: z.boolean().optional().default(false),
});

const instructionValidationSchema = z.object({
  step: z.number({ required_error: 'Step number is required' }).int().positive('Step number must be a positive integer'),
  title: z.string().trim().max(120).optional().default(''),
  description: z.string({ required_error: 'Step description is required' }).trim().min(5, 'Step description must be at least 5 characters').max(1500),
  timerMinutes: z.number().nonnegative('Timer cannot be negative').nullable().optional().default(null),
  tips: z.string().trim().optional().default(''),
  mediaUrl: z.string().trim().optional().default(''),
});

const nutritionValidationSchema = z.object({
  calories: z.number().nonnegative().optional().default(0),
  protein: z.number().nonnegative().optional().default(0),
  carbohydrates: z.number().nonnegative().optional().default(0),
  fat: z.number().nonnegative().optional().default(0),
  fiber: z.number().nonnegative().optional().default(0),
  sugar: z.number().nonnegative().optional().default(0),
  sodium: z.number().nonnegative().optional().default(0),
});

export const createRecipeSchema = z.object({
  title: z
    .string({ required_error: 'Recipe title is required' })
    .trim()
    .min(3, 'Recipe title must be at least 3 characters')
    .max(120, 'Recipe title cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Recipe description is required' })
    .trim()
    .min(10, 'Recipe description must be at least 10 characters')
    .max(2000, 'Recipe description cannot exceed 2000 characters'),
  cuisine: z
    .string({ required_error: 'Cuisine is required' })
    .trim()
    .min(2, 'Cuisine must be at least 2 characters')
    .max(60, 'Cuisine cannot exceed 60 characters'),
  category: z.enum(
    [
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
    { errorMap: () => ({ message: 'Invalid recipe category provided' }) }
  ),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Chef Special']).optional().default('Medium'),
  prepTime: z
    .number({ required_error: 'Prep time in minutes is required' })
    .int('Prep time must be an integer')
    .nonnegative('Prep time cannot be negative'),
  cookTime: z
    .number({ required_error: 'Cook time in minutes is required' })
    .int('Cook time must be an integer')
    .nonnegative('Cook time cannot be negative'),
  servings: z
    .number({ required_error: 'Servings yield is required' })
    .int('Servings must be an integer')
    .min(1, 'Recipe must provide at least 1 serving')
    .max(100, 'Servings cannot exceed 100'),
  dietaryInfo: z
    .array(
      z.enum([
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
      ])
    )
    .optional()
    .default([]),
  ingredients: z
    .array(ingredientValidationSchema)
    .min(1, 'Recipe must contain at least one ingredient'),
  instructions: z
    .array(instructionValidationSchema)
    .min(1, 'Recipe must contain at least one instruction step'),
  nutrition: nutritionValidationSchema.optional().default({}),
  tags: z.array(z.string().trim().toLowerCase()).optional().default([]),
  imageUrl: z.string().trim().optional().default('https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80'),
  galleryImages: z.array(z.string().trim()).optional().default([]),
  status: z.enum(['draft', 'published', 'archived']).optional().default('published'),
  isFeatured: z.boolean().optional().default(false),
  authorName: z.string().trim().optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const scaleRecipeSchema = z.object({
  targetServings: z
    .number({ required_error: 'Target servings is required' })
    .int('Target servings must be an integer')
    .min(1, 'Target servings must be at least 1')
    .max(500, 'Target servings cannot exceed 500'),
});

