"use client";

import { useEffect } from "react";

// global-error.jsx wraps the root layout — must include its own <html> and <body>.
// It is the last resort when an error escapes all nested error boundaries.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // ChunkLoadError: old HTML references chunks replaced by a new deployment.
    // Hard-reload fetches fresh HTML pointing to the new chunks.
    if (
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Failed to fetch dynamically imported module")
    ) {
      window.location.reload();
      return;
    }

    if (process.env.NODE_ENV === "production") {
      // e.g. Sentry.captureException(error)
    }
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong — CarmelMart</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100svh;
            padding: 1rem;
          }
          .card {
            background: #fff;
            border-radius: 1rem;
            padding: 2.5rem 2rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
          }
          .icon {
            width: 56px; height: 56px;
            background: #fef3c7;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.25rem;
            font-size: 1.75rem;
          }
          h1 { font-size: 1.25rem; font-weight: 700; color: #111; margin-bottom: 0.5rem; }
          p  { font-size: 0.9rem; color: #6b7280; margin-bottom: 1.75rem; line-height: 1.6; }
          .btn-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
          .btn {
            padding: 0.65rem 1.5rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            text-decoration: none;
            display: inline-flex; align-items: center; gap: 0.4rem;
          }
          .btn-primary { background: #560238; color: #fff; }
          .btn-primary:hover { opacity: 0.9; }
          .btn-outline { background: transparent; color: #374151; border: 1.5px solid #e5e7eb; }
          .btn-outline:hover { background: #f3f4f6; }
        `}</style>
      </head>
      <body>
        <div className="card" style={{
          background:"#fff",borderRadius:"1rem",padding:"2.5rem 2rem",
          maxWidth:"420px",width:"100%",textAlign:"center",
          boxShadow:"0 10px 40px rgba(0,0,0,0.08)",margin:"0 auto"
        }}>
          <div style={{
            width:56,height:56,background:"#fef3c7",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 1.25rem",fontSize:"1.75rem"
          }}>⚠️</div>
          <h1 style={{fontSize:"1.25rem",fontWeight:700,color:"#111",marginBottom:"0.5rem"}}>
            Something went wrong
          </h1>
          <p style={{fontSize:"0.9rem",color:"#6b7280",marginBottom:"1.75rem",lineHeight:1.6}}>
            An unexpected error occurred. Try refreshing — if the problem persists, go back to the homepage.
          </p>
          <div style={{display:"flex",gap:"0.75rem",justifyContent:"center",flexWrap:"wrap"}}>
            <button
              onClick={reset}
              style={{
                padding:"0.65rem 1.5rem",borderRadius:"9999px",fontSize:"0.875rem",
                fontWeight:600,cursor:"pointer",border:"none",background:"#560238",color:"#fff"
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding:"0.65rem 1.5rem",borderRadius:"9999px",fontSize:"0.875rem",
                fontWeight:600,cursor:"pointer",background:"transparent",color:"#374151",
                border:"1.5px solid #e5e7eb",textDecoration:"none",display:"inline-flex",
                alignItems:"center"
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
