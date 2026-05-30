"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, RotateCcw, ArrowLeft, Clock, ChevronDown } from "lucide-react";
import Link from "next/link";
import BankSelect from "@/components/ui/BankSelect";

const STATUS = { IDLE: "idle", LOADING: "loading", SUCCESS: "success", ERROR: "error" };

const INITIAL_STATE = {
  status:      STATUS.IDLE,
  accountName: null,
  errorMsg:    null,
  durationMs:  null,
  request:     null,
  response:    null,
  httpStatus:  null,
  autoTriggered: false,
};

export default function BankVerifyTester() {
  const [bankCode,       setBankCode]       = useState("");
  const [bankName,       setBankName]       = useState("");
  const [accountNumber,  setAccountNumber]  = useState("");
  const [result,         setResult]         = useState(INITIAL_STATE);
  const [showRaw,        setShowRaw]        = useState(false);

  const canVerify = bankCode && accountNumber.length === 10;

  async function verify(auto = false) {
    if (!canVerify || result.status === STATUS.LOADING) return;

    const payload = { account_number: accountNumber, account_bank: bankCode };
    const startedAt = performance.now();

    setResult((prev) => ({
      ...prev,
      status:        STATUS.LOADING,
      autoTriggered: auto,
      request:       payload,
      response:      null,
      httpStatus:    null,
      accountName:   null,
      errorMsg:      null,
      durationMs:    null,
    }));

    try {
      const res  = await fetch("/api/flutterwave/verify-account", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data     = await res.json();
      const duration = Math.round(performance.now() - startedAt);

      if (res.ok && data.account_name) {
        setResult({
          status:        STATUS.SUCCESS,
          accountName:   data.account_name,
          errorMsg:      null,
          durationMs:    duration,
          request:       payload,
          response:      data,
          httpStatus:    res.status,
          autoTriggered: auto,
        });
      } else {
        setResult({
          status:        STATUS.ERROR,
          accountName:   null,
          errorMsg:      data.error ?? "Verification failed",
          durationMs:    duration,
          request:       payload,
          response:      data,
          httpStatus:    res.status,
          autoTriggered: auto,
        });
      }
    } catch (err) {
      setResult({
        status:        STATUS.ERROR,
        accountName:   null,
        errorMsg:      err.message ?? "Network error",
        durationMs:    Math.round(performance.now() - startedAt),
        request:       payload,
        response:      null,
        httpStatus:    null,
        autoTriggered: auto,
      });
    }
  }

  // Auto-verify when 10 digits are entered and a bank is selected
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      verify(true);
    }
  }, [accountNumber, bankCode]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setBankCode("");
    setBankName("");
    setAccountNumber("");
    setResult(INITIAL_STATE);
    setShowRaw(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Bank Verification Tester</h1>
          <p className="text-xs text-gray-400">Calls the live Flutterwave <code className="bg-gray-100 px-1 rounded">/resolve_account</code> API</p>
        </div>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full">
          Admin Dev Tool
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Inputs</h2>

          <BankSelect
            value={bankCode}
            onChange={(code, name) => { setBankCode(code); setBankName(name); }}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Account Number</label>
              <span className={`text-xs font-mono ${accountNumber.length === 10 ? "text-green-600 font-semibold" : "text-gray-400"}`}>
                {accountNumber.length}/10
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter 10-digit NUBAN"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary bg-white font-mono tracking-widest"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => verify(false)}
              disabled={!canVerify || result.status === STATUS.LOADING}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {result.status === STATUS.LOADING ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
              ) : (
                "Verify Account"
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Result card */}
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
          result.status === STATUS.SUCCESS ? "border-green-200" :
          result.status === STATUS.ERROR   ? "border-red-200"   :
          "border-gray-200"
        }`}>

          {/* Status bar */}
          <div className={`px-6 py-3 flex items-center gap-3 ${
            result.status === STATUS.SUCCESS ? "bg-green-50 border-b border-green-100" :
            result.status === STATUS.ERROR   ? "bg-red-50 border-b border-red-100"     :
            result.status === STATUS.LOADING ? "bg-blue-50 border-b border-blue-100"   :
            "bg-gray-50 border-b border-gray-100"
          }`}>
            {result.status === STATUS.SUCCESS && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
            {result.status === STATUS.ERROR   && <XCircle      className="w-5 h-5 text-red-500 shrink-0" />}
            {result.status === STATUS.LOADING && <Loader2      className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
            {result.status === STATUS.IDLE    && <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />}

            <span className={`text-sm font-semibold ${
              result.status === STATUS.SUCCESS ? "text-green-800" :
              result.status === STATUS.ERROR   ? "text-red-700"   :
              result.status === STATUS.LOADING ? "text-blue-700"  :
              "text-gray-500"
            }`}>
              {result.status === STATUS.SUCCESS ? "Verified"    :
               result.status === STATUS.ERROR   ? "Failed"      :
               result.status === STATUS.LOADING ? "Verifying…"  :
               "Waiting for input"}
            </span>

            {result.autoTriggered && result.status !== STATUS.IDLE && (
              <span className="text-xs text-gray-400 italic">auto-triggered</span>
            )}

            {result.durationMs !== null && (
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 font-mono">
                <Clock className="w-3 h-3" />{result.durationMs}ms
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Idle */}
            {result.status === STATUS.IDLE && (
              <p className="text-sm text-gray-400 text-center py-4">
                Select a bank and enter a 10-digit account number — verification triggers automatically.
              </p>
            )}

            {/* Success result */}
            {result.status === STATUS.SUCCESS && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Account Name</p>
                  <p className="text-2xl font-bold text-gray-900">{result.accountName}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bank</p>
                    <p className="text-sm font-medium text-gray-700">{bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Account Number</p>
                    <p className="text-sm font-mono font-medium text-gray-700">{accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bank Code</p>
                    <p className="text-sm font-mono font-medium text-gray-700">{bankCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error result */}
            {result.status === STATUS.ERROR && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Error</p>
                  <p className="text-base font-semibold text-red-700">{result.errorMsg}</p>
                </div>
                {result.httpStatus && (
                  <p className="text-xs text-gray-400">
                    HTTP <span className="font-mono font-semibold text-gray-600">{result.httpStatus}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => verify(false)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Try again →
                </button>
              </div>
            )}

            {/* Raw debug panel */}
            {result.request && (
              <div className="border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRaw ? "rotate-180" : ""}`} />
                  {showRaw ? "Hide" : "Show"} raw request / response
                </button>

                {showRaw && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Request</p>
                      <pre className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Response
                        {result.httpStatus && (
                          <span className={`ml-2 font-mono ${result.httpStatus < 300 ? "text-green-600" : "text-red-500"}`}>
                            {result.httpStatus}
                          </span>
                        )}
                      </p>
                      <pre className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                        {result.response ? JSON.stringify(result.response, null, 2) : "null"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick reference */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick test accounts</h2>
          <div className="space-y-2 text-xs text-gray-500">
            {[
              { bank: "GTBank (058)",      number: "0123456789", note: "Use a real NUBAN — Flutterwave resolves live" },
              { bank: "Access Bank (044)", number: "0987654321", note: "Invalid account → expect a 400 error" },
            ].map((row) => (
              <div key={row.number} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="font-mono text-gray-700 w-36 shrink-0">{row.number}</span>
                <span className="text-gray-500">{row.bank}</span>
                <span className="text-gray-400 italic ml-auto text-right">{row.note}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
