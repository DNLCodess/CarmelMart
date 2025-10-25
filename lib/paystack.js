export const paystackHelpers = {
  initializePayment: (email, amount, reference, onSuccess, onClose) => {
    if (typeof window === "undefined") return;

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
      email,
      amount: amount * 100, // Convert to kobo
      currency: "NGN",
      ref: reference,
      onClose: () => {
        if (onClose) onClose();
      },
      callback: (response) => {
        if (onSuccess) onSuccess(response);
      },
    });

    handler.openIframe();
  },

  verifyPayment: async (reference) => {
    try {
      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Payment verification error:", error);
      return { success: false, error: error.message };
    }
  },

  transferFunds: async (amount, recipientCode, reason) => {
    try {
      const response = await fetch("/api/paystack/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, recipientCode, reason }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Transfer error:", error);
      return { success: false, error: error.message };
    }
  },

  createTransferRecipient: async (name, accountNumber, bankCode) => {
    try {
      const response = await fetch("/api/paystack/recipient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, accountNumber, bankCode }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Create recipient error:", error);
      return { success: false, error: error.message };
    }
  },

  generateReference: () => {
    return `CM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
};
