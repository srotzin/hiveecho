export function requirePayment(priceOrFn) {
  return (req, res, next) => {
    const price = typeof priceOrFn === 'function' ? priceOrFn(req) : priceOrFn;

    // Free endpoints pass through
    if (price === 0) return next();

    const paymentHeader = req.headers['x-payment'] || req.headers['x-402-payment'];

    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment Required',
        price_usdc: price,
        message: `This endpoint requires $${price.toFixed(2)} USDC. Include x-payment header.`,
        protocol: 'x402',
        accepts: ['USDC'],
        network: 'base'
      });
    }

    // In Phase 1, accept any payment token (simulated settlement)
    req.payment = {
      amount: price,
      token: paymentHeader,
      settled: true,
      simulated: true
    };

    next();
  };
}

// Dynamic pricing functions
export function historicalQueryPrice(req) {
  const atParam = req.query?.at;
  return atParam ? 0.10 : 0; // Historical = $0.10, current = free
}

export function contractAnchorPrice(req) {
  const valueUsdc = req.body?.value_usdc || 0;
  const price = valueUsdc * 0.0001; // 0.01% of contract value
  return Math.max(0.10, Math.min(price, 100)); // min $0.10, max $100
}
