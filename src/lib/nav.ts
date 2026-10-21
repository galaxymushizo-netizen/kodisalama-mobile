/** Cross-tab navigation intent, e.g. open the "new payment" sheet on the Payments tab. */
export type Intent = {
  type: string
  tenantId?: string
  paymentId?: string
}
