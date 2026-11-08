import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_chefflow_2026';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  appInfo: {
    name: 'ChefFlow-Engine',
    version: '1.0.0',
  },
});

/**
 * Verify active subscription status directly with Stripe API
 * @param {string} subscriptionId
 * @returns {Promise<{ isValid: boolean, status: string, cancelAtPeriodEnd: boolean, currentPeriodEnd: Date|null, error?: string }>}
 */
export const verifyStripeSubscriptionStatus = async (subscriptionId) => {
  if (!subscriptionId) {
    return { isValid: false, status: 'none', cancelAtPeriodEnd: false, currentPeriodEnd: null };
  }

  // If in test/offline environment without real Stripe credentials, check simulated ID
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
    const isMockActive = subscriptionId.startsWith('sub_active_');
    return {
      isValid: isMockActive,
      status: isMockActive ? 'active' : 'canceled',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isValid = subscription.status === 'active' || subscription.status === 'trialing';

    return {
      isValid,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      customerId: subscription.customer,
    };
  } catch (err) {
    return {
      isValid: false,
      status: 'error',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      error: err.message,
    };
  }
};

