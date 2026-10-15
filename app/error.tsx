"use client";
import Link from "next/link";
/** Runtime error boundary (Miro: "Something went wrong" with a retry). Nothing is lost: boards autosave to the device. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mi-404"><div className="mi-404-card"><div className="mi-404-art err" aria-hidden><i /><i /><i /></div><h1>Something went wrong</h1><p>Your latest changes are saved on this device. Try again, or go back to your boards.</p>
    <p className="mi-404-code">{error.digest ?? error.message}</p>
    <div className="mi-404-acts"><button className="mx-dark" onClick={reset}>Try again</button><Link className="mx-light" href="/app">Your boards</Link></div></div></div>;
}
