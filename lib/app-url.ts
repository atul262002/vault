export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.API_URL ||
    "https://vaultpay.co.in"
  ).replace(/\/$/, "");
}

export function getOrderPortalUrl(orderId: string) {
  return `${getAppUrl()}/orders/${orderId}`;
}
