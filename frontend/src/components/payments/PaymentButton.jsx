import { CreditCard } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "../../api/client";
import Button from "../common/Button";
import { formatMoney } from "../../utils/format";

let razorpayScriptPromise;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

export default function PaymentButton({ settlement, onSuccess, onFailure, size = "sm" }) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const ready = await loadRazorpay();
      if (!ready) throw new Error("Razorpay Checkout could not be loaded");

      const order = await apiRequest("/payments/create-order", {
        method: "POST",
        body: { settlement_id: settlement.id },
        auth: true,
      });

      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.razorpay_key_id,
          amount: order.amount_paise,
          currency: order.currency,
          name: "PayCircle",
          description: `Settlement #${settlement.id}`,
          order_id: order.razorpay_order_id,
          handler: async (response) => {
            try {
              await apiRequest("/payments/verify", {
                method: "POST",
                body: {
                  settlement_id: settlement.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                auth: true,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          theme: { color: "#2563eb" },
        });
        checkout.on("payment.failed", (response) => {
          reject(new Error(response.error?.description || "Payment failed"));
        });
        checkout.open();
      });

      onSuccess?.();
    } catch (err) {
      onFailure?.(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="primary"
      size={size}
      icon={CreditCard}
      loading={loading}
      disabled={settlement.status === "completed"}
      onClick={handlePay}
    >
      Pay {formatMoney(settlement.amount)}
    </Button>
  );
}
