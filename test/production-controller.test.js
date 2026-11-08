import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { createRecipe } from '../controllers/recipe.controller.js';
import { sampleRecipes } from '../utils/seedData.js';

console.log('🧪 Testing Production Recipe Creation Controller (JWT, RBAC, Validation & Stripe)...\n');

// Mock response factory
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

async function runTests() {
  const JWT_SECRET = process.env.JWT_SECRET || 'chefflow_super_secret_jwt_key_2026_dev';

  // -------------------------------------------------------------------------
  // Test 1: Reject request when Authorization Bearer token is missing (401)
  // -------------------------------------------------------------------------
  console.log('Test 1: Reject missing JWT authentication header (401)...');
  {
    const req = {
      headers: {},
      body: { ...sampleRecipes[0] },
    };
    const res = createMockResponse();

    await createRecipe(req, res, () => {});

    if (res.statusCode === 401 && res.body?.code === 'AUTH_TOKEN_MISSING') {
      console.log('✅ Test 1 Passed: Rejected missing token with 401 and AUTH_TOKEN_MISSING code.');
    } else {
      console.error('❌ Test 1 Failed:', res.statusCode, res.body);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Test 2: Reject request with invalid/forged JWT token (401)
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Reject invalid/expired JWT token (401)...');
  {
    const req = {
      headers: { authorization: 'Bearer invalid.forged.token' },
      body: { ...sampleRecipes[0] },
    };
    const res = createMockResponse();

    await createRecipe(req, res, () => {});

    if (res.statusCode === 401 && res.body?.code === 'AUTH_TOKEN_INVALID') {
      console.log('✅ Test 2 Passed: Rejected invalid token with 401 and AUTH_TOKEN_INVALID code.');
    } else {
      console.error('❌ Test 2 Failed:', res.statusCode, res.body);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Test 3: Reject Normal tier user who has exceeded free quota (402)
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Reject Normal user exceeding free quota limit of 5 recipes (402)...');
  {
    const normalUser = {
      _id: '507f191e810c19729de860ea',
      name: 'Free Cook',
      email: 'freecook@chefflow.test',
      role: 'normal',
      membershipStatus: 'active',
    };

    const req = {
      user: normalUser,
      headers: {},
      body: { ...sampleRecipes[0] },
    };
    const res = createMockResponse();

    // Mock countDocuments to simulate 5 existing recipes
    const originalCount = (await import('../models/Recipe.js')).Recipe.countDocuments;
    (await import('../models/Recipe.js')).Recipe.countDocuments = async () => 5;

    await createRecipe(req, res, () => {});

    // Restore
    (await import('../models/Recipe.js')).Recipe.countDocuments = originalCount;

    if (res.statusCode === 402 && res.body?.code === 'PUBLISHING_QUOTA_EXCEEDED') {
      console.log('✅ Test 3 Passed: Blocked Normal user at quota limit with 402 and upgrade link.');
    } else {
      console.error('❌ Test 3 Failed:', res.statusCode, res.body);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Test 4: Reject Premium user with missing Stripe subscription ID (402)
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Reject Premium user with missing Stripe subscription ID (402)...');
  {
    const premiumUserWithoutSub = {
      _id: '507f191e810c19729de860eb',
      name: 'Unsubscribed Chef',
      email: 'nosub@chefflow.test',
      role: 'premium',
      stripeSubscriptionId: null,
      membershipStatus: 'active',
    };

    const req = {
      user: premiumUserWithoutSub,
      headers: {},
      body: { ...sampleRecipes[0] },
    };
    const res = createMockResponse();

    const originalCount = (await import('../models/Recipe.js')).Recipe.countDocuments;
    (await import('../models/Recipe.js')).Recipe.countDocuments = async () => 10;

    await createRecipe(req, res, () => {});

    (await import('../models/Recipe.js')).Recipe.countDocuments = originalCount;

    if (res.statusCode === 402 && res.body?.code === 'STRIPE_SUBSCRIPTION_REQUIRED') {
      console.log('✅ Test 4 Passed: Caught missing Stripe subscription on Premium role with 402.');
    } else {
      console.error('❌ Test 4 Failed:', res.statusCode, res.body);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Test 5: Reject Premium user with canceled/inactive Stripe subscription (402)
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Reject Premium user with inactive Stripe subscription (402)...');
  {
    const premiumUserCanceled = {
      _id: '507f191e810c19729de860ec',
      name: 'Canceled Chef',
      email: 'canceled@chefflow.test',
      role: 'premium',
      stripeSubscriptionId: 'sub_canceled_12345',
      membershipStatus: 'active',
      save: async () => {},
    };

    const req = {
      user: premiumUserCanceled,
      headers: {},
      body: { ...sampleRecipes[0] },
    };
    const res = createMockResponse();

    const originalCount = (await import('../models/Recipe.js')).Recipe.countDocuments;
    (await import('../models/Recipe.js')).Recipe.countDocuments = async () => 10;

    await createRecipe(req, res, () => {});

    (await import('../models/Recipe.js')).Recipe.countDocuments = originalCount;

    if (res.statusCode === 402 && res.body?.code === 'STRIPE_SUBSCRIPTION_INACTIVE') {
      console.log('✅ Test 5 Passed: Inactive Stripe subscription blocked with 402.');
    } else {
      console.error('❌ Test 5 Failed:', res.statusCode, res.body);
      process.exit(1);
    }
  }

  console.log('\n🎉 All Production Recipe Controller tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

