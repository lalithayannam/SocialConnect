import { Router } from "express";
import auth from "../middleware/auth.js";
import { listFundraisers, createFundraiser, createDonationOrder, verifyDonation, myDonations, verifyFundraiser } from "../controllers/fundraiserController.js";

const router = Router();
router.get("/", auth, listFundraisers);
router.post("/", auth, createFundraiser);
router.get("/my-donations", auth, myDonations);
router.post("/:id/donation-order", auth, createDonationOrder);
router.post("/verify-payment", auth, verifyDonation);
router.post("/:id/verify", verifyFundraiser);
export default router;
