import React, { useEffect, useState } from "react";
import api from "./services/api";

const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
const causes = ["Community project", "Education", "Health", "Environment", "Emergency relief", "Other"];

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load secure payment checkout. Check your internet connection."));
    document.body.appendChild(script);
  });
}

export default function Fundraising({ user }) {
  const [fundraisers, setFundraisers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", cause: causes[0], targetAmount: "", deadline: "" });
  const [amounts, setAmounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const [fundraiserResponse, donationResponse] = await Promise.all([api.get("/fundraisers"), api.get("/fundraisers/my-donations")]);
    setFundraisers(fundraiserResponse.data);
    setDonations(donationResponse.data);
  };
  useEffect(() => { refresh().catch(() => setError("Could not load fundraising data. Please check the backend.")); }, []);

  const createFundraiser = async e => {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/fundraisers", { ...form, targetAmount: Number(form.targetAmount) });
      setForm({ title: "", description: "", cause: causes[0], targetAmount: "", deadline: "" });
      setNotice("Fundraiser created. It will accept donations after verification.");
      await refresh();
    } catch (e) { setError(e.response?.data?.message || "Could not create fundraiser."); }
    finally { setBusy(false); }
  };

  const donate = async fundraiser => {
    const amount = Number(amounts[fundraiser._id]);
    if (!Number.isInteger(amount) || amount < 1) { setError("Enter a donation amount in whole rupees."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await loadRazorpay();
      const { data: order } = await api.post(`/fundraisers/${fundraiser._id}/donation-order`, { amount });
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SocialConnect",
        description: `Donation to ${fundraiser.title}`,
        order_id: order.orderId,
        prefill: { name: user.name || "", email: user.email || "" },
        theme: { color: "#6855e8" },
        handler: async response => {
          try {
            const { data } = await api.post("/fundraisers/verify-payment", response);
            setNotice(data.emailSent ? `${data.message} A greeting email has been sent to ${user.email}.` : `${data.message} Email notification is not configured or could not be sent; check the backend SMTP settings.`);
            setAmounts(old => ({ ...old, [fundraiser._id]: "" }));
            await refresh();
          } catch (e) { setError(e.response?.data?.message || "Payment was received but verification failed. Please contact the administrator with your payment ID."); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      checkout.on("payment.failed", response => { setError(response.error?.description || "Payment did not complete. You have not been recorded as a donor."); setBusy(false); });
      checkout.open();
    } catch (e) { setError(e.response?.data?.message || e.message || "Could not start payment."); setBusy(false); }
  };

  return <section className="fundraising-page">
    <div className="fundraising-hero"><div><p className="eyebrow">COMMUNITY GIVING</p><h2>Small acts. Meaningful change.</h2><p>Support verified community causes or start a project that brings people together.</p></div><div className="fundraising-heart">♡</div></div>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {error && <div className="error fundraising-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
    <section className="fundraiser-create"><div className="section-title"><div><p className="eyebrow">START SOMETHING GOOD</p><h3>Create a fundraiser</h3></div><span className="verification-chip">Review required</span></div>
      <form onSubmit={createFundraiser} className="fundraiser-form">
        <label className="field-label">Fundraiser title<input required maxLength="120" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Books for a community library" /></label>
        <label className="field-label">Cause<select required value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })}>{causes.map(cause => <option key={cause}>{cause}</option>)}</select></label>
        <label className="field-label wide-field">Description<textarea required maxLength="2000" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explain the goal, who benefits, and how donations will be used." /></label>
        <label className="field-label">Target amount (₹)<input required type="number" min="1" step="1" max="10000000" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="10000" /></label>
        <label className="field-label">Deadline<input required type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></label>
        <div className="wide-field form-footnote">Fundraisers remain pending until an administrator verifies the cause. Only verified fundraisers can accept online donations.</div>
        <button className="primary wide-field" disabled={busy}>{busy ? "Please wait…" : "Submit fundraiser for review ↗"}</button>
      </form>
    </section>

    <div className="section-title fundraiser-list-title"><div><p className="eyebrow">MAKE AN IMPACT</p><h3>Community fundraisers</h3></div><span className="feed-pill">{fundraisers.length} listed</span></div>
    <div className="fundraiser-grid">{fundraisers.map(f => {
      const progress = Math.min(100, Math.round((f.raisedAmount / f.targetAmount) * 100));
      const expired = new Date(f.deadline) <= new Date();
      const closed = expired || f.status !== "active" || f.raisedAmount >= f.targetAmount;
      return <article className="fundraiser-card" key={f._id}>
        <div className="fundraiser-card-top"><span className="cause-pill">{f.cause}</span><span className={f.verified ? "verified-chip" : "verification-chip"}>{f.verified ? "✓ Verified" : "◷ Pending review"}</span></div>
        <h4>{f.title}</h4><p className="fundraiser-description">{f.description}</p>
        <div className="fundraiser-owner">Started by <b>{f.creator?.name || "Community member"}</b></div>
        <div className="fundraiser-amounts"><div><strong>{money(f.raisedAmount)}</strong><span>raised</span></div><div className="amount-target"><strong>{money(f.targetAmount)}</strong><span>goal</span></div></div>
        <div className="progress-track" role="progressbar" aria-label="Fundraising progress" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-meta"><span>{progress}% funded</span><span>Ends {new Date(f.deadline).toLocaleDateString()}</span></div>
        {!f.verified && <p className="review-note">This cause is awaiting administrator verification.</p>}
        {f.verified && !closed && <div className="donate-row"><label className="sr-only" htmlFor={`amount-${f._id}`}>Donation amount in rupees</label><span>₹</span><input id={`amount-${f._id}`} type="number" min="1" max="100000" step="1" placeholder="Amount" value={amounts[f._id] || ""} onChange={e => setAmounts(old => ({ ...old, [f._id]: e.target.value }))}/><button className="primary" disabled={busy} onClick={() => donate(f)}>Donate</button></div>}
        {f.verified && closed && <div className="closed-note">{progress >= 100 ? "Goal reached — thank you!" : "This fundraiser is closed."}</div>}
      </article>;
    })}</div>
    {!fundraisers.length && <div className="empty-state fundraiser-empty"><div className="empty-icon">♡</div><h3>Be the first to support a cause</h3><p>Create a fundraiser above. After review, the community can donate and track its progress.</p></div>}
    <section className="donation-history"><div className="section-title"><div><p className="eyebrow">YOUR KINDNESS</p><h3>Your donations</h3></div></div>{donations.length ? donations.map(d => <div className="donation-history-row" key={d._id}><div className="donation-check">✓</div><div className="donation-history-info"><b>{d.fundraiser?.title || "Community fundraiser"}</b><span>{new Date(d.createdAt).toLocaleDateString()} · Successful</span></div><strong>{money(d.amount)}</strong></div>) : <p className="muted small-copy">Your completed donations will appear here.</p>}</section>
    <p className="donation-disclaimer">Payments are processed by Razorpay. Donate only to causes you trust. SocialConnect is a project demo; verification and fund disbursement procedures must be managed responsibly before public launch.</p>
  </section>;
}
