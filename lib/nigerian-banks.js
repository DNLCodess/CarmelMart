// Nigerian commercial banks, digital banks, and microfinance banks accepted by Flutterwave.
// `code` is the CBN/Flutterwave bank code used for account resolution and transfers.
export const NIGERIAN_BANKS = [
  { name: "Access Bank",                      code: "044"    },
  { name: "Carbon (Paylater)",                code: "565"    },
  { name: "Citibank Nigeria",                 code: "023"    },
  { name: "Ecobank Nigeria",                  code: "050"    },
  { name: "Fidelity Bank",                    code: "070"    },
  { name: "First Bank of Nigeria",            code: "011"    },
  { name: "First City Monument Bank (FCMB)",  code: "214"    },
  { name: "Guaranty Trust Bank (GTBank)",     code: "058"    },
  { name: "Heritage Bank",                    code: "030"    },
  { name: "Keystone Bank",                    code: "082"    },
  { name: "Kuda Bank",                        code: "090267" },
  { name: "Moniepoint MFB",                   code: "50515"  },
  { name: "OPay",                             code: "100004" },
  { name: "PalmPay",                          code: "999991" },
  { name: "Parallex Bank",                    code: "526"    },
  { name: "Polaris Bank",                     code: "076"    },
  { name: "Providus Bank",                    code: "101"    },
  { name: "Stanbic IBTC Bank",               code: "221"    },
  { name: "Standard Chartered Bank",          code: "068"    },
  { name: "Sterling Bank",                    code: "232"    },
  { name: "SunTrust Bank",                    code: "100"    },
  { name: "Titan Trust Bank",                 code: "102"    },
  { name: "Union Bank of Nigeria",            code: "032"    },
  { name: "United Bank for Africa (UBA)",     code: "033"    },
  { name: "Unity Bank",                       code: "215"    },
  { name: "VFD Microfinance Bank",            code: "566"    },
  { name: "Wema Bank",                        code: "035"    },
  { name: "Zenith Bank",                      code: "057"    },
];

/** Look up a bank name by its code. Returns null if not found. */
export function getBankName(code) {
  return NIGERIAN_BANKS.find((b) => b.code === code)?.name ?? null;
}
