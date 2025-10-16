CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unionid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resetToken` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resetTokenExpiry` datetime DEFAULT NULL,
  `resetCode` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resetCodeExpiry` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9c98f005249412c8333a3b2c59` (`openid`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mileage` int NOT NULL,
  `manufacturing_date` date DEFAULT NULL,
  `image` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_88b36924d769e4df751bcfbf249` (`user_id`),
  CONSTRAINT `FK_88b36924d769e4df751bcfbf249` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_id` int NOT NULL,
  `maintenance_type` enum('mileage','date') COLLATE utf8mb4_unicode_ci NOT NULL,
  `maintenance_value` double NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_maintenance_mileage` double DEFAULT NULL,
  `target_maintenance_date` date DEFAULT NULL,
  `last_maintenance_date` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_85eff417123017920bff03c9f32` (`vehicle_id`),
  CONSTRAINT `FK_85eff417123017920bff03c9f32` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `component_id` int DEFAULT NULL,
  `component_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maintenance_date` date NOT NULL,
  `mileage_at_maintenance` double DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_790f0292ac82ad5e08dad5f4552` (`vehicle_id`),
  KEY `FK_cfc18d5a473b60d8fd0ed10f035` (`component_id`),
  CONSTRAINT `FK_790f0292ac82ad5e08dad5f4552` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_cfc18d5a473b60d8fd0ed10f035` FOREIGN KEY (`component_id`) REFERENCES `maintenance_components` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户注册邮箱',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '反馈内容',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '提交时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_data_backup` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户邮箱（唯一）',
  `minio_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MinIO文件URL',
  `upload_time` datetime NOT NULL COMMENT '最近上传时间',
  `upload_count` int NOT NULL DEFAULT '0' COMMENT '当天上传次数',
  `download_time` datetime DEFAULT NULL COMMENT '最近下载时间',
  `download_count` int NOT NULL DEFAULT '0' COMMENT '当天下载次数',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '记录创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_f2470a8471cb6e59235137fb2e` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;