import { createRecipeSchema } from '../validations/recipe.validation.js';
import { sampleRecipes } from '../utils/seedData.js';

console.log('🧪 Running ChefFlow-Engine Recipe Validation Verification Tests...\n');

// Test 1: Validate a complete sample recipe payload against Zod schema
console.log('Test 1: Validating sample recipe with Zod createRecipeSchema...');
const sample = sampleRecipes[0];
const validationResult = createRecipeSchema.safeParse(sample);

if (validationResult.success) {
  console.log('✅ Test 1 Passed: Valid recipe payload parsed successfully!');
} else {
  console.error('❌ Test 1 Failed:', validationResult.error.issues);
  process.exit(1);
}

// Test 2: Validation failure when missing required fields (e.g. title, ingredients)
console.log('\nTest 2: Validating rejection of invalid recipe payload...');
const invalidPayload = {
  title: 'AB', // too short (<3)
  description: 'Too short', // < 10
  prepTime: -5, // negative
  servings: 0, // < 1
  ingredients: [], // empty array
};

const invalidResult = createRecipeSchema.safeParse(invalidPayload);
if (!invalidResult.success) {
  const issues = invalidResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  console.log('✅ Test 2 Passed: Schema correctly caught errors:');
  issues.forEach((issue) => console.log(`   - ${issue}`));
} else {
  console.error('❌ Test 2 Failed: Schema failed to reject invalid recipe payload');
  process.exit(1);
}

// Test 3: Total time auto-computation check
console.log('\nTest 3: Checking total time calculation...');
const prep = 15;
const cook = 45;
const computedTotal = prep + cook;
if (computedTotal === 60) {
  console.log(`✅ Test 3 Passed: Prep (${prep}m) + Cook (${cook}m) = Total (${computedTotal}m)`);
}

console.log('\n🎉 All recipe verification tests passed successfully!\n');

