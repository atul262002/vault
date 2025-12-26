import React from 'react'

const Cancellation = () => {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cancellation & Refund Policy</h1>
      <p><strong>Last Updated:</strong> 8 April - 2025</p>

      <p className="mt-4">
        At Vault (S&A Associates), we are committed to providing a secure and trustworthy environment for buyers and sellers. This Cancellation & Refund Policy outlines the circumstances under which users may request cancellations or refunds.
      </p>

      <h2 className="text-xl font-semibold mt-6">1. Escrow-Backed Transactions</h2>
      <ul className="list-disc list-inside">
        <li>All payments made on Vault are held securely in escrow (via RazorpayX) until the buyer confirms receipt of the product or service as agreed.</li>
        <li>Funds are released to the seller only after buyer confirmation or expiration of the escrow protection window.</li>
        <li>This ensures protection for both parties and minimizes the need for cancellations.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">2. Cancellations</h2>
      <h3 className="font-semibold mt-2">Buyers</h3>
      <ul className="list-disc list-inside">
        <li>Buyers may request cancellation before the product is marked as shipped.</li>
        <li>After shipment, cancellations are only accepted if:
          <ul className="list-disc list-inside ml-6">
            <li>The item is undelivered beyond the agreed timeline</li>
            <li>The item is significantly different from the listing</li>
          </ul>
        </li>
      </ul>

      <h3 className="font-semibold mt-2">Sellers</h3>
      <ul className="list-disc list-inside">
        <li>Sellers can cancel a transaction only before accepting an offer or confirming shipment.</li>
        <li>Repeated cancellations without cause may lead to account restrictions.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">3. Refund Policy</h2>
      <p>We offer a 100% refund in the following cases:</p>
      <ul className="list-disc list-inside">
        <li>Confirmed fraud or misrepresentation by the seller</li>
        <li>Non-delivery of goods or services after payment</li>
        <li>Item significantly not as described in the listing</li>
      </ul>
      <p>Refunds are processed after dispute review by our internal team, supported by our AI-based dispute system.</p>
      <p className="mt-2"><strong>Note:</strong> All refunds are issued to the original payment method and may take 5–7 business days to reflect depending on your bank or payment provider.</p>

      <h2 className="text-xl font-semibold mt-6">4. Dispute Resolution Process</h2>
      <ol className="list-decimal list-inside">
        <li>Report the issue through the transaction dashboard</li>
        <li>Vault’s AI assistant will review chat logs and listing terms</li>
        <li>A human moderator will make the final decision</li>
        <li>You will be notified of the outcome via in-app alert and email</li>
      </ol>

      <h2 className="text-xl font-semibold mt-6">5. Exceptions</h2>
      <ul className="list-disc list-inside">
        <li>Buyer changes mind after successful delivery</li>
        <li>Minor deviations in product not affecting functionality</li>
        <li>Disputes filed after the escrow protection window has expired</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">6. Contact</h2>
      <p>For any questions or concerns, contact our support team at: <a href="mailto:support@vault.org.in" className="text-blue-600 underline">support@vault.org.in</a></p>
    </div>
  )
}

export default Cancellation
