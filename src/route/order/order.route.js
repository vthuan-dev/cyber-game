import express from "express";
import * as orderController from "../../controllers/order.controller";
import * as paymentController from "../../controllers/payment.controller";
import { getTimeLineOrderRoom } from "../../controllers/order-room-detail.controller";

const router = express.Router();
router.post("/add", orderController.create);
router.put("/update/:id", orderController.update);
router.delete("/remove/:id", orderController.deleteById);
router.get("/searchById/:id", orderController.findById);
router.get("/", orderController.getAll);
router.get("/detail/:id", orderController.getOrderDetail);
router.get("/statistic-product", orderController.statisticProductOrder);
router.get("/statistic-room", orderController.statisticRoomOrder);
router.post("/statistic-revenue", orderController.statisticTotalPrice);


router.post("/payment/create", paymentController.createPayment);
router.get("/payment/callback/vnpay_return", paymentController.savePayment);
router.put("/payment-status/:orderId", orderController.updateOrderAfterPayment);

router.get("/get-one-order-by-user-id/:id", orderController.getUserOrders);

router.post("/get-order-room-timeline", getTimeLineOrderRoom);

router.post("/extend-room-time", orderController.extendRoomTime);
router.post("/approve-extend-room", orderController.approveExtendRoom);

router.get("/extend-requests/:order_id", orderController.getExtendRequests);

router.get("/pending-extend-requests", orderController.getPendingExtendRequests);

router.put("/extend-payment", orderController.updateExtendPaymentStatus);

router.get("/statistic-room-detail", orderController.statisticRoomDetail);

// router.get("/detail/:id", orderController.getDetailById);
// router.get("/get-one-order-by-user-id/:id", orderController.getOrderByUserId);

export default router;
