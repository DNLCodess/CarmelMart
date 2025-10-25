import { v4 as uuidv4 } from "uuid";

export const generateReferralCode = () => {
  return `CM${uuidv4().split("-")[0].toUpperCase()}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^(\+234|0)[789][01]\d{8}$/;
  return re.test(phone);
};

export const validateNIN = (nin) => {
  return /^\d{11}$/.test(nin);
};

export const validateCAC = (cac) => {
  return /^[A-Z0-9]{7,}$/.test(cac);
};

/**
 * Utility Functions for Vendor System
 * Common functions used across the application
 */

/**
 * Generate a unique referral code
 * Format: VND + 8 random alphanumeric characters
 */

/**
 * Format currency (Nigerian Naira)
 */

/**
 * Format date to readable string
 */

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
  }

  return formatDate(date);
}

/**
 * Validate Nigerian phone number
 */
export function validateNigerianPhone(phone) {
  // Accepts formats: +2348012345678, 08012345678, 2348012345678
  const regex = /^(\+234|0)?[789][01]\d{8}$/;
  return regex.test(phone);
}

/**
 * Format Nigerian phone number to international format
 */
export function formatNigerianPhone(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Handle different formats
  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith("0")) {
    return `+234${cleaned.substring(1)}`;
  }

  return `+234${cleaned}`;
}

/**
 * Validate NIN (National Identity Number)
 */

/**
 * Validate CAC RC Number
 */
export function validateRCNumber(rcNumber) {
  // RC number is alphanumeric
  return /^[A-Z0-9]+$/i.test(rcNumber);
}

/**
 * Validate email address
 */

/**
 * Generate transaction reference
 */
export function generateTransactionRef(prefix = "TXN") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current, previous) {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
}

/**
 * Get status color
 */
export function getStatusColor(status) {
  const colors = {
    active: "green",
    pending: "yellow",
    inactive: "gray",
    suspended: "red",
    verified: "green",
    unverified: "yellow",
    completed: "green",
    processing: "blue",
    failed: "red",
    cancelled: "red",
  };

  return colors[status?.toLowerCase()] || "gray";
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return "?";

  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Sleep function (for delays)
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if object is empty
 */
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate random color
 */
export function generateRandomColor() {
  const colors = [
    "#560238", // primary
    "#f49238", // accent
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // yellow
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Parse query string
 */
export function parseQueryString(queryString) {
  const params = new URLSearchParams(queryString);
  const result = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
}

/**
 * Build query string
 */
export function buildQueryString(params) {
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}

/**
 * File size formatter
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

/**
 * Check if user is on mobile
 */
export function isMobile() {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Scroll to element
 */
export function scrollToElement(elementId, offset = 0) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const y = element.getBoundingClientRect().top + window.pageYOffset + offset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

/**
 * Local storage helpers with JSON support
 */
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * API error handler
 */
export function handleAPIError(error) {
  if (error.response) {
    // Server responded with error
    return {
      message: error.response.data?.message || "An error occurred",
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: "No response from server. Please check your connection.",
      status: 0,
    };
  } else {
    // Something else happened
    return {
      message: error.message || "An unexpected error occurred",
      status: -1,
    };
  }
}

/**
 * Retry async function
 */
export async function retryAsync(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay);
    }
  }
}
