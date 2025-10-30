// lib/qoreIdHelpers.js
export const qoreIdHelpers = {
  verifyNIN: async (nin, firstName, lastName) => {
    try {
      if (!nin || !firstName || !lastName) {
        throw new Error("NIN, firstName, and lastName are required");
      }

      const response = await fetch("/api/qoreid/verify-nin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nin, firstName, lastName }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Verification failed");
      }

      return await response.json();
    } catch (error) {
      console.error("NIN verification error:", error);
      return { success: false, error: error.message };
    }
  },

  verifyCAC: async (cacNumber) => {
    try {
      const response = await fetch("/api/qoreid/verify-cac", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cacNumber }),
      });

      return await response.json();
    } catch (error) {
      console.error("CAC verification error:", error);
      return { success: false, error: error.message };
    }
  },
};
