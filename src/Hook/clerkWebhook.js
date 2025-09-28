import express from "express";
import bodyParser from("body-parser");
import { Webhook } from("svix");
import { handleClerkWebhook } from("../controllers/webhookController");

const router = express.Router();

router.post(
  "/clerk",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    let evt;
    try {
      evt = wh.verify(req.body, req.headers);
    } catch (err) {
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send("Invalid signature");
    }

    const eventType = evt.type;
    const userData = evt.data;

    try {
      await handleClerkWebhook(eventType, userData);
      res.status(200).send("Webhook processed");
    } catch (err) {
      res.status(500).send("Error processing webhook");
    }
  }
);

module.exports = router;
