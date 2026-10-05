const Stripe = require('stripe');

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  // Do not pin apiVersion: the SDK ships the version it was generated against,
  // and forcing an old one (e.g. 2022-11-15) requests an API version Stripe no
  // longer serves.
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  stripe = null;
}

module.exports = stripe;
