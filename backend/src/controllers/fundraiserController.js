import crypto from "node:crypto";
import Razorpay from "razorpay";
import Fundraiser from "../models/Fundraiser.js";
import Donation from "../models/Donation.js";
import User from "../models/User.js";
import { sendDonationGreeting } from "../utils/email.js";

const publicFundraiser = (f) => ({ ...f.toObject(), progress: Math.min(100, Math.round((f.raisedAmount / f.targetAmount) * 100)) });
const razorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error("Online donations are not configured yet. Add Razorpay test keys to backend/.env.");
    error.status = 503;
    throw error;
  }
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

export async function listFundraisers(_req, res) {
  try {
    const fundraisers = await Fundraiser.find({ status: "active" }).populate("creator", "name username avatar").sort({ createdAt: -1 }).limit(100);
    res.json(fundraisers.map(publicFundraiser));
  } catch (err) { res.status(500).json({ message: "Could not load fundraisers." }); }
}

export async function createFundraiser(req, res) {
  try {
    const { title, description, cause, targetAmount, deadline } = req.body;
    const target = Number(targetAmount);
    const endDate = new Date(deadline);
    if (!title?.trim() || !description?.trim() || !cause || !Number.isFinite(target) || target < 1 || !deadline || Number.isNaN(endDate.getTime()) || endDate <= new Date()) {
      return res.status(400).json({ message: "Enter a title, description, cause, valid target, and future deadline." });
    }
    const fundraiser = await Fundraiser.create({ creator: req.userId, title: title.trim(), description: description.trim(), cause, targetAmount: target, deadline: endDate, verified: process.env.FUNDRAISER_AUTO_VERIFY === "true", verificationNote: process.env.FUNDRAISER_AUTO_VERIFY === "true" ? "Auto-verified for development" : "Awaiting administrator review" });
    await fundraiser.populate("creator", "name username avatar");
    res.status(201).json(publicFundraiser(fundraiser));
  } catch (err) { res.status(500).json({ message: err.message || "Could not create fundraiser." }); }
}

export async function createDonationOrder(req, res) {
  try {
    const fundraiser = await Fundraiser.findById(req.params.id);
    if (!fundraiser) return res.status(404).json({ message: "Fundraiser not found." });
    if (!fundraiser.verified) return res.status(403).json({ message: "This fundraiser must be verified before it can accept donations." });
    if (fundraiser.status !== "active" || fundraiser.deadline <= new Date() || fundraiser.raisedAmount >= fundraiser.targetAmount) return res.status(400).json({ message: "This fundraiser is closed or has reached its target." });
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return res.status(400).json({ message: "Donation must be a whole rupee amount between ₹1 and ₹100,000." });
    if (amount > fundraiser.targetAmount - fundraiser.raisedAmount) return res.status(400).json({ message: "Donation amount cannot exceed the remaining fundraising goal." });
    const client = razorpayClient();
    const order = await client.orders.create({ amount: amount * 100, currency: "INR", receipt: `don_${Date.now()}_${String(req.userId).slice(-6)}`, notes: { fundraiserId: String(fundraiser._id), donorId: String(req.userId) } });
    await Donation.create({ fundraiser: fundraiser._id, donor: req.userId, amount, currency: "INR", status: "created", razorpayOrderId: order.id });
    res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, fundraiser: { id: fundraiser._id, title: fundraiser.title } });
  } catch (err) { res.status(err.status || 500).json({ message: err.status ? err.message : "Could not start the donation. Please try again." }); }
}

export async function verifyDonation(req, res) {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) return res.status(400).json({ message: "Payment verification details are incomplete." });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${orderId}|${paymentId}`).digest("hex");
    const a = Buffer.from(expected); const b = Buffer.from(String(signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ message: "Payment signature could not be verified." });

    const client = razorpayClient();
    const payment = await client.payments.fetch(paymentId);
    if (payment.order_id !== orderId || payment.status !== "captured") return res.status(400).json({ message: "Payment is not captured for this order yet. Please contact support if money was debited." });
    const donation = await Donation.findOne({ razorpayOrderId: orderId }).populate("donor", "name email").populate("fundraiser");
    if (!donation) return res.status(404).json({ message: "Donation order not found." });
    if (String(donation.donor._id) !== String(req.userId)) return res.status(403).json({ message: "This donation order does not belong to your account." });
    if (donation.status !== "paid") {
      donation.status = "paid";
      donation.razorpayPaymentId = paymentId;
      await donation.save();
      const updated = await Fundraiser.findOneAndUpdate({ _id: donation.fundraiser._id }, { $inc: { raisedAmount: donation.amount } }, { new: true });
      if (updated && updated.raisedAmount >= updated.targetAmount) { updated.status = "completed"; await updated.save(); }
    }
    let emailSent = Boolean(donation.emailSentAt);
    if (!emailSent) {
      try {
        emailSent = await sendDonationGreeting({ donor: donation.donor, fundraiser: donation.fundraiser, donation });
        if (emailSent) { donation.emailSentAt = new Date(); await donation.save(); }
      } catch (emailError) { console.error("Donation succeeded but greeting email failed:", emailError.message); }
    }
    res.json({ message: "Donation successful. Thank you for supporting this cause!", emailSent });
  } catch (err) { res.status(500).json({ message: "Could not verify donation." }); }
}

export async function myDonations(req, res) {
  try {
    const donations = await Donation.find({ donor: req.userId, status: "paid" }).populate("fundraiser", "title cause").sort({ createdAt: -1 }).limit(100);
    res.json(donations);
  } catch { res.status(500).json({ message: "Could not load donation history." }); }
}

export async function verifyFundraiser(req, res) {
  if (!process.env.FUNDRAISER_ADMIN_KEY || req.headers["x-admin-key"] !== process.env.FUNDRAISER_ADMIN_KEY) return res.status(403).json({ message: "Administrator verification key is invalid." });
  try {
    const fundraiser = await Fundraiser.findByIdAndUpdate(req.params.id, { verified: true, verificationNote: "Verified by administrator" }, { new: true }).populate("creator", "name username avatar");
    if (!fundraiser) return res.status(404).json({ message: "Fundraiser not found." });
    res.json(publicFundraiser(fundraiser));
  } catch { res.status(500).json({ message: "Could not verify fundraiser." }); }
}
