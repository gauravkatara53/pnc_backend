import { Router } from "express";
import bodyParser from "body-parser";
import { Webhook } from "svix";
import { handleClerkWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post(
  "/clerk",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    let evt;
    try {
      evt = wh.verify(req.body, req.headers);
    } catch (err) {
      return res.status(400).send("Invalid signature");
    }

    try {
      await handleClerkWebhook(evt.type, evt.data);
      res.status(200).send("Webhook processed");
    } catch (err) {
      res.status(500).send("Error processing webhook");
    }
  }
);

export default router;
