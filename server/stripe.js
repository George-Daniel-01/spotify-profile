const Stripe = require('stripe');

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2022-11-15',
  });
} else {
  stripe = null;
}

module.exports = stripe;
