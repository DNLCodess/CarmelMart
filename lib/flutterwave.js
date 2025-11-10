// lib/flutterwave.js

const FLUTTERWAVE_SCRIPT_URL = "https://checkout.flutterwave.com/v3.js";

// Load Flutterwave script dynamically
const loadFlutterwaveScript = () => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.FlutterwaveCheckout) {
      resolve(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src="${FLUTTERWAVE_SCRIPT_URL}"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Flutterwave script"))
      );
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = FLUTTERWAVE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Failed to load Flutterwave script"));
    document.head.appendChild(script);
  });
};

export const flutterwaveHelpers = {
  initializePayment: async (
    email,
    amount,
    reference,
    customerName,
    verificationType,
    onSuccess, // Success callback
    onClose // Close callback
  ) => {
    if (typeof window === "undefined") {
      console.error("Window object not available");
      return;
    }

    try {
      // Ensure Flutterwave script is loaded
      await loadFlutterwaveScript();

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
          title: "CarmelMart - Vendor Registration Fee",
          description: "One-time vendor registration payment",
          logo: "https://your-domain.com/logo.png", // Optional: Add your logo URL
        },
        // ✅ CRITICAL: Use callback instead of redirect_url
        callback: function (response) {
          console.log("Payment callback response:", response);

          // Close the modal
          if (window.FlutterwaveCheckout) {
            const modal = document.querySelector(".flw-modal");
            if (modal) modal.style.display = "none";
            const backdrop = document.querySelector(".flw-modal-backdrop");
            if (backdrop) backdrop.style.display = "none";
          }

          // Call success handler
          if (onSuccess && typeof onSuccess === "function") {
            onSuccess(response);
          }
        },
        onclose: function () {
          console.log("Payment modal closed");

          // Call close handler
          if (onClose && typeof onClose === "function") {
            onClose();
          }
        },
      };

      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout(config);
      } else {
        throw new Error("Flutterwave checkout not available");
      }
    } catch (error) {
      console.error("Flutterwave initialization error:", error);
      throw error;
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

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

  // Utility to preload script
  preloadScript: async () => {
    try {
      await loadFlutterwaveScript();
      return true;
    } catch (error) {
      console.error("Failed to preload Flutterwave script:", error);
      return false;
    }
  },
};
