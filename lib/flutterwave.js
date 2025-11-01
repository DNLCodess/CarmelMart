export const flutterwaveHelpers = {
  initializePayment: (
    email,
    amount,
    reference,
    customerName,
    onSuccess,
    onClose
  ) => {
    if (typeof window === "undefined") return;

    const config = {
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: reference,
      amount: amount,
      currency: "NGN",
      payment_options: "card,ussd,banktransfer",
      customer: {
        email: email,
        name: customerName || email.split("@")[0],
      },
      customizations: {
        title: "Vendor Registration Fee",
        description: "One-time vendor registration payment",
        logo: process.env.NEXT_PUBLIC_APP_LOGO || "",
      },
      callback: (response) => {
        if (response.status === "successful") {
          if (onSuccess) onSuccess(response);
        }
        // Close modal after callback
        if (window.FlutterwaveCheckout) {
          window.FlutterwaveCheckout.close();
        }
      },
      onclose: () => {
        if (onClose) onClose();
      },
    };

    if (window.FlutterwaveCheckout) {
      window.FlutterwaveCheckout(config);
    } else {
      console.error("Flutterwave script not loaded");
    }
  },

  verifyPayment: async (transactionId) => {
    try {
      const response = await fetch("/api/flutterwave/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Payment verification error:", error);
      return { success: false, error: error.message };
    }
  },

  transferFunds: async (
    amount,
    accountNumber,
    accountBank,
    reason,
    reference
  ) => {
    try {
      const response = await fetch("/api/flutterwave/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          account_number: accountNumber,
          account_bank: accountBank,
          narration: reason,
          reference,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Transfer error:", error);
      return { success: false, error: error.message };
    }
  },

  getBanks: async () => {
    try {
      const response = await fetch("/api/flutterwave/banks", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Get banks error:", error);
      return { success: false, error: error.message };
    }
  },

  verifyAccountNumber: async (accountNumber, accountBank) => {
    try {
      const response = await fetch("/api/flutterwave/verify-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: accountBank,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Account verification error:", error);
      return { success: false, error: error.message };
    }
  },

  generateReference: () => {
    return `CM-FLW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
};
