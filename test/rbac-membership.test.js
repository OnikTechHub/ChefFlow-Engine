import { requireRole, requireActiveMembership, authorizeRecipePublisher } from '../middlewares/auth.middleware.js';

console.log('🧪 Testing Role-Based Access Control (RBAC) & Active Membership Security...\n');

// Mock response object helper
const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.jsonData = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.jsonData = data;
    return res;
  };
  return res;
};

// Test 1: Reject unauthenticated requests
console.log('Test 1: Unauthenticated user check...');
{
  const req = { user: null };
  const res = createMockRes();
  let nextCalled = false;

  requireRole('chef', 'admin')(req, res, () => { nextCalled = true; });

  if (res.statusCode === 401 && !nextCalled) {
    console.log('✅ Test 1 Passed: Unauthenticated request rejected with 401.');
  } else {
    console.error('❌ Test 1 Failed: Expected 401 status, got:', res.statusCode);
    process.exit(1);
  }
}

// Test 2: Reject non-chef/admin role (e.g. regular 'user')
console.log('\nTest 2: Role check rejecting regular "user" role from publishing...');
{
  const req = {
    user: {
      _id: 'user123',
      name: 'Standard Foodie',
      role: 'user',
      membershipStatus: 'active',
    },
  };
  const res = createMockRes();
  let nextCalled = false;

  requireRole('chef', 'admin')(req, res, () => { nextCalled = true; });

  if (res.statusCode === 403 && !nextCalled && res.jsonData?.message?.includes('not authorized')) {
    console.log('✅ Test 2 Passed: Regular user rejected with 403 Forbidden.');
  } else {
    console.error('❌ Test 2 Failed: Expected 403 for user role, got:', res.statusCode);
    process.exit(1);
  }
}

// Test 3: Reject chef with inactive membership status
console.log('\nTest 3: Membership check rejecting chef with "inactive" membership status...');
{
  const req = {
    user: {
      _id: 'chef123',
      name: 'Chef Inactive',
      role: 'chef',
      membershipStatus: 'inactive',
    },
  };
  const res = createMockRes();
  let nextCalled = false;

  requireActiveMembership(req, res, () => { nextCalled = true; });

  if (res.statusCode === 403 && !nextCalled && res.jsonData?.message?.includes('active membership is required')) {
    console.log('✅ Test 3 Passed: Inactive chef rejected with 403 Forbidden.');
  } else {
    console.error('❌ Test 3 Failed: Expected 403 for inactive membership, got:', res.statusCode);
    process.exit(1);
  }
}

// Test 4: Reject chef with expired membership
console.log('\nTest 4: Membership check rejecting chef with expired subscription date...');
{
  const req = {
    user: {
      _id: 'chef456',
      name: 'Chef Expired',
      role: 'chef',
      membershipStatus: 'active',
      membershipExpiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // expired yesterday
    },
  };
  const res = createMockRes();
  let nextCalled = false;

  requireActiveMembership(req, res, () => { nextCalled = true; });

  if (res.statusCode === 403 && !nextCalled && res.jsonData?.message?.includes('expired')) {
    console.log('✅ Test 4 Passed: Expired membership rejected with 403 Forbidden.');
  } else {
    console.error('❌ Test 4 Failed: Expected 403 for expired date, got:', res.statusCode);
    process.exit(1);
  }
}

// Test 5: Allow authenticated chef with ACTIVE membership
console.log('\nTest 5: Permitting authorized chef with active membership...');
{
  const req = {
    user: {
      _id: 'chef789',
      name: 'Chef Gordon',
      role: 'chef',
      membershipStatus: 'active',
      membershipExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days remaining
    },
  };
  const res = createMockRes();
  let rolePassed = false;
  let membershipPassed = false;

  requireRole('chef', 'admin')(req, res, () => { rolePassed = true; });
  requireActiveMembership(req, res, () => { membershipPassed = true; });

  if (rolePassed && membershipPassed) {
    console.log('✅ Test 5 Passed: Active chef passed both RBAC and membership checks!');
  } else {
    console.error('❌ Test 5 Failed: Active chef was incorrectly blocked');
    process.exit(1);
  }
}

// Test 6: Verify Admin bypasses membership check
console.log('\nTest 6: Admin privilege bypass of membership requirement...');
{
  const req = {
    user: {
      _id: 'admin001',
      name: 'Platform Admin',
      role: 'admin',
      membershipStatus: 'inactive', // inactive membership, but is admin
    },
  };
  const res = createMockRes();
  let nextCalled = false;

  authorizeRecipePublisher(req, res, () => { nextCalled = true; });

  if (nextCalled) {
    console.log('✅ Test 6 Passed: Administrator allowed to publish regardless of membership status.');
  } else {
    console.error('❌ Test 6 Failed: Administrator was blocked');
    process.exit(1);
  }
}

console.log('\n🎉 All RBAC and Active Membership security tests passed successfully!\n');

