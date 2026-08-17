const { createClient } = require('@supabase/supabase-js');
const stripe = require('./stripe');

let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
  );
} else {
  supabase = null;
}

const createOrRetrieveCustomer = async ({ email, uuid }) => {
  const { data, error } = await supabase
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', uuid)
    .single();

  if (error || !data?.stripe_customer_id) {
    const customerData = {
      metadata: { spotifyUUID: uuid },
    };
    if (email) customerData.email = email;

    const customer = await stripe.customers.create(customerData);
    const { error: insertError } = await supabase
      .from('customers')
      .insert([{ id: uuid, stripe_customer_id: customer.id }]);
    if (insertError) throw insertError;
    return customer.id;
  }
  return data.stripe_customer_id;
};

const manageSubscriptionStatusChange = async (
  subscriptionId,
  customerId,
  createAction = false,
) => {
  const { data: customerData, error: noCustomerError } = await supabase
    .from('customers')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  if (noCustomerError) throw noCustomerError;
  if (!customerData || !customerData.id) {
    throw new Error(`No customer found with Stripe ID: ${customerId}`);
  }

  const { id: uuid } = customerData;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  });

  const toDateTime = (secs) => {
    const t = new Date('1970-01-01T00:30:00Z');
    t.setSeconds(secs);
    return t;
  };

  const subscriptionData = {
    id: subscription.id,
    user_id: uuid,
    metadata: subscription.metadata,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    quantity: subscription.quantity,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at ? toDateTime(subscription.cancel_at).toISOString() : null,
    canceled_at: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    current_period_start: toDateTime(subscription.current_period_start).toISOString(),
    current_period_end: toDateTime(subscription.current_period_end).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    ended_at: subscription.ended_at ? toDateTime(subscription.ended_at).toISOString() : null,
    trial_start: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trial_end: subscription.trial_end ? toDateTime(subscription.trial_end).toISOString() : null,
  };

  const { error } = await supabase.from('subscriptions').upsert([subscriptionData]);
  if (error) throw error;

  if (createAction && subscription.default_payment_method && uuid) {
    const { name, phone, address } = subscription.default_payment_method.billing_details;
    if (name || phone || address) {
      await stripe.customers.update(subscription.default_payment_method.customer, {
        name,
        phone,
        address,
      });
      await supabase
        .from('customers')
        .update({
          billing_address: { ...address },
          payment_method: { ...subscription.default_payment_method[subscription.default_payment_method.type] },
        })
        .eq('id', uuid);
    }
  }
};

const upsertProductRecord = async (product) => {
  const productData = {
    id: product.id,
    active: product.active,
    name: product.name,
    description: product.description ?? undefined,
    image: product.images?.[0] ?? null,
    metadata: product.metadata,
  };
  const { error } = await supabase.from('products').upsert([productData]);
  if (error) throw error;
};

const upsertPriceRecord = async (price) => {
  const priceData = {
    id: price.id,
    product_id: typeof price.product === 'string' ? price.product : '',
    active: price.active,
    currency: price.currency,
    description: price.nickname ?? undefined,
    type: price.type,
    unit_amount: price.unit_amount ?? undefined,
    interval: price.recurring?.interval,
    interval_count: price.recurring?.interval_count,
    trial_period_days: price.recurring?.trial_period_days,
    metadata: price.metadata,
  };
  const { error } = await supabase.from('prices').upsert([priceData]);
  if (error) throw error;
};

const getActiveProductsWithPrices = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });
  if (error) throw error;
  return data || [];
};

module.exports = {
  supabase,
  createOrRetrieveCustomer,
  manageSubscriptionStatusChange,
  upsertProductRecord,
  upsertPriceRecord,
  getActiveProductsWithPrices,
};
