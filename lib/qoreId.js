export const qoreIdHelpers = {
  verifyNIN: async (nin) => {
    try {
      const response = await fetch("/api/qoreid/verify-nin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nin }),
      });

      const data = await response.json();
      return data;
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

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("CAC verification error:", error);
      return { success: false, error: error.message };
    }
  },
};
