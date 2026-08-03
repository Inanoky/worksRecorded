import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
	? new Stripe(stripeSecretKey, {
			typescript: true,
		})
	: (new Proxy(
			{},
			{
				get() {
					throw new Error("STRIPE_SECRET_KEY is required to use Stripe.");
				},
			},
		) as Stripe);
