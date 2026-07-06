ALTER TABLE `payments`
  ADD COLUMN `razorpay_order_id` VARCHAR(100) DEFAULT NULL AFTER `created_by`,
  ADD COLUMN `razorpay_payment_id` VARCHAR(100) DEFAULT NULL AFTER `razorpay_order_id`,
  ADD COLUMN `razorpay_signature` VARCHAR(255) DEFAULT NULL AFTER `razorpay_payment_id`,
  ADD COLUMN `plan_id` INT DEFAULT NULL AFTER `razorpay_signature`,
  ADD INDEX `idx_payment_razorpay_order` (`razorpay_order_id`);
