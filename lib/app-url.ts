export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.API_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getOrderPortalUrl(orderId: string) {
  return `${getAppUrl()}/orders/${orderId}`;
}
