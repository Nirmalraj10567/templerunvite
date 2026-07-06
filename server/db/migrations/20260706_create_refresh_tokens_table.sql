CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `token` VARCHAR(500) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `revoked` TINYINT(1) DEFAULT 0,
  KEY `idx_refresh_user` (`user_id`),
  KEY `idx_refresh_token` (`token`(100)),
  KEY `idx_refresh_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
