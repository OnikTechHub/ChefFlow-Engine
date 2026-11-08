import { validationResult } from 'express-validator';
import { validateRecipeCreationRules } from '../middlewares/recipeValidator.middleware.js';
import { sampleRecipes } from '../utils/seedData.js';

console.log('🧪 Testing express-validator Security Checks for Recipe Creation...\n');

// Helper to execute validator chain against a simulated request object
const runValidation = async (reqBody) => {
  const req = { body: reqBody };
  for (const middleware of validateRecipeCreationRules) {
    await middleware.run(req);
  }
  return validationResult(req);
};

async function runTests() {
  // Test 1: Complete and valid recipe payload
  console.log('Test 1: Validating full sample recipe with title and ingredients...');
  const validPayload = { ...sampleRecipes[0] };
  const result1 = await runValidation(validPayload);

  if (result1.isEmpty()) {
    console.log('✅ Test 1 Passed: Valid recipe payload passed all checks with 0 errors.');
  } else {
    console.error('❌ Test 1 Failed: Unexpected validation errors:', result1.array());
    process.exit(1);
  }

  // Test 2: Missing title
  console.log('\nTest 2: Verifying rejection when "title" is missing or empty...');
  const missingTitlePayload = {
    ...sampleRecipes[0],
    title: '   ',
  };
  const result2 = await runValidation(missingTitlePayload);
  const titleError = result2.array().find((err) => err.path === 'title');

  if (titleError) {
    console.log(`✅ Test 2 Passed: express-validator caught missing title: "${titleError.msg}"`);
  } else {
    console.error('❌ Test 2 Failed: Did not catch missing title');
    process.exit(1);
  }

  // Test 3: Missing ingredients
  console.log('\nTest 3: Verifying rejection when "ingredients" is empty or missing...');
  const missingIngredientsPayload = {
    ...sampleRecipes[0],
    ingredients: [],
  };
  const result3 = await runValidation(missingIngredientsPayload);
  const ingredientsError = result3.array().find((err) => err.path === 'ingredients');

  if (ingredientsError) {
    console.log(
      `✅ Test 3 Passed: express-validator caught empty ingredients: "${ingredientsError.msg}"`
    );
  } else {
    console.error('❌ Test 3 Failed: Did not catch empty ingredients');
    process.exit(1);
  }

  // Test 4: Malformed ingredient items (e.g. missing name, invalid amount)
  console.log('\nTest 4: Verifying rejection of malformed ingredient items...');
  const malformedIngredientsPayload = {
    ...sampleRecipes[0],
    ingredients: [
      { name: '', amount: -5, unit: '' }, // invalid name, negative amount, empty unit
    ],
  };
  const result4 = await runValidation(malformedIngredientsPayload);
  const ingredientItemErrors = result4.array().filter((err) => err.path.startsWith('ingredients[0]'));

  if (ingredientItemErrors.length >= 2) {
    console.log('✅ Test 4 Passed: Caught invalid ingredient fields:');
    ingredientItemErrors.forEach((err) => console.log(`   - [${err.path}] ${err.msg}`));
  } else {
    console.error('❌ Test 4 Failed: Expected multiple ingredient item errors, got:', ingredientItemErrors);
    process.exit(1);
  }

  console.log('\n🎉 All express-validator security tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

