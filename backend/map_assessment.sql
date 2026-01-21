-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Aug 29, 2025 at 06:11 AM
-- Server version: 9.1.0
-- PHP Version: 8.1.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `map_assessment`
--

-- --------------------------------------------------------

--
-- Table structure for table `assessments`
--

DROP TABLE IF EXISTS `assessments`;
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `grade_id` int DEFAULT NULL,
  `assessment_period` enum('Fall','Winter','Spring') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `total_questions` int DEFAULT '10',
  `correct_answers` int DEFAULT '0',
  `date_taken` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `duration_minutes` int DEFAULT NULL,
  `time_limit_minutes` int DEFAULT NULL,
  `rit_score` int DEFAULT NULL,
  `year` int NOT NULL DEFAULT '2025',
  PRIMARY KEY (`id`),
  KEY `subject_id` (`subject_id`),
  KEY `idx_student_subject` (`student_id`,`subject_id`),
  KEY `idx_assessments_rit_score` (`rit_score`),
  KEY `idx_assessments_year` (`year`),
  KEY `idx_assessments_student_subject_year` (`student_id`,`subject_id`,`year`),
  KEY `idx_assessments_grade` (`grade_id`),
  KEY `idx_assessments_student_subject_grade` (`student_id`,`subject_id`,`grade_id`),
  KEY `idx_assessments_grade_year` (`grade_id`,`year`),
  KEY `idx_assessments_comprehensive` (`student_id`,`subject_id`,`grade_id`,`year`,`assessment_period`)
) ENGINE=MyISAM AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessments`
--

INSERT INTO `assessments` (`id`, `student_id`, `subject_id`, `grade_id`, `assessment_period`, `total_questions`, `correct_answers`, `date_taken`, `duration_minutes`, `time_limit_minutes`, `rit_score`, `year`) VALUES
(1, 2, 4, 1, 'Spring', 10, 7, '2025-08-26 08:46:38', 1, 30, 290, 2025),
(2, 3, 4, 1, 'Spring', 10, 3, '2025-08-26 08:49:32', 1, 30, 177, 2025),
(3, 2, 4, 1, 'Fall', 50, 32, '2022-09-15 04:30:00', 45, 30, 183, 2022),
(4, 2, 4, 1, 'Winter', 52, 35, '2022-12-10 04:30:00', 46, 30, 196, 2022),
(5, 2, 4, 1, 'Spring', 48, 30, '2022-04-20 04:30:00', 44, 30, 200, 2022),
(6, 2, 4, 1, 'Fall', 50, 36, '2023-09-14 04:30:00', 47, 30, 204, 2023),
(7, 2, 4, 1, 'Winter', 49, 34, '2023-12-12 04:30:00', 43, 30, 211, 2023),
(8, 2, 4, 1, 'Spring', 51, 37, '2023-04-18 04:30:00', 45, 30, 210, 2023),
(9, 2, 4, 1, 'Fall', 53, 38, '2024-09-16 04:30:00', 48, 30, 220, 2024),
(10, 2, 4, 1, 'Winter', 50, 35, '2024-12-11 04:30:00', 47, 30, 215, 2024),
(11, 2, 4, 1, 'Spring', 52, 39, '2024-04-19 04:30:00', 46, 30, 225, 2024),
(96, 2, 4, NULL, 'Spring', 15, 0, '2025-08-29 06:02:44', NULL, 5, NULL, 2025),
(14, 3, 4, 1, 'Fall', 50, 32, '2022-09-15 04:30:00', 45, 30, 181, 2022),
(15, 3, 4, 1, 'Winter', 52, 34, '2022-12-10 04:30:00', 46, 30, 190, 2022),
(16, 3, 4, 1, 'Spring', 48, 30, '2022-04-20 04:30:00', 44, 30, 157, 2022),
(17, 3, 4, 1, 'Fall', 50, 36, '2023-09-14 04:30:00', 47, 30, 178, 2023),
(18, 3, 4, 1, 'Winter', 49, 34, '2023-12-12 04:30:00', 43, 30, 200, 2023),
(19, 3, 4, 1, 'Spring', 51, 37, '2023-04-18 04:30:00', 45, 30, 181, 2023),
(20, 3, 4, 1, 'Fall', 53, 38, '2024-09-16 04:30:00', 48, 30, 175, 2024),
(21, 3, 4, 1, 'Winter', 50, 35, '2024-12-11 04:30:00', 47, 30, 185, 2024),
(22, 3, 4, 1, 'Spring', 52, 39, '2024-04-19 04:30:00', 46, 30, 164, 2024),
(23, 3, 4, 1, 'Fall', 55, 42, '2025-09-17 04:30:00', 49, 30, 174, 2025),
(24, 3, 4, 1, 'Winter', 54, 41, '2025-12-13 04:30:00', 50, 30, 174, 2025),
(25, 4, 4, 1, 'Fall', 50, 33, '2022-09-15 04:30:00', 45, 30, 190, 2022),
(26, 4, 4, 1, 'Winter', 52, 36, '2022-12-10 04:30:00', 46, 30, 188, 2022),
(27, 4, 4, 1, 'Spring', 48, 31, '2022-04-20 04:30:00', 44, 30, 230, 2022),
(28, 4, 4, 1, 'Fall', 50, 37, '2023-09-14 04:30:00', 47, 30, 173, 2023),
(29, 4, 4, 1, 'Winter', 49, 35, '2023-12-12 04:30:00', 43, 30, 198, 2023),
(30, 4, 4, 1, 'Spring', 51, 38, '2023-04-18 04:30:00', 45, 30, 202, 2023),
(31, 4, 4, 1, 'Fall', 53, 39, '2024-09-16 04:30:00', 48, 30, 204, 2024),
(32, 4, 4, 1, 'Winter', 50, 36, '2024-12-11 04:30:00', 47, 30, 173, 2024),
(33, 4, 4, 1, 'Spring', 52, 40, '2024-04-19 04:30:00', 46, 30, 228, 2024),
(34, 4, 4, 1, 'Fall', 55, 43, '2025-09-17 04:30:00', 49, 30, 185, 2025),
(35, 4, 4, 1, 'Winter', 54, 42, '2025-12-13 04:30:00', 50, 30, 197, 2025),
(36, 4, 4, 1, 'Spring', 56, 44, '2025-04-21 04:30:00', 51, 30, 208, 2025),
(37, 5, 4, 1, 'Fall', 50, 31, '2022-09-15 04:30:00', 45, 30, 169, 2022),
(38, 5, 4, 1, 'Winter', 52, 34, '2022-12-10 04:30:00', 46, 30, 132, 2022),
(39, 5, 4, 1, 'Spring', 48, 30, '2022-04-20 04:30:00', 44, 30, 176, 2022),
(40, 5, 4, 1, 'Fall', 50, 35, '2023-09-14 04:30:00', 47, 30, 162, 2023),
(41, 5, 4, 1, 'Winter', 49, 34, '2023-12-12 04:30:00', 43, 30, 172, 2023),
(42, 5, 4, 1, 'Spring', 51, 36, '2023-04-18 04:30:00', 45, 30, 145, 2023),
(43, 5, 4, 1, 'Fall', 53, 37, '2024-09-16 04:30:00', 48, 30, 159, 2024),
(44, 5, 4, 1, 'Winter', 50, 35, '2024-12-11 04:30:00', 47, 30, 190, 2024),
(45, 5, 4, 1, 'Spring', 52, 38, '2024-04-19 04:30:00', 46, 30, 151, 2024),
(46, 5, 4, 1, 'Fall', 55, 40, '2025-09-17 04:30:00', 49, 30, 169, 2025),
(47, 5, 4, 1, 'Winter', 54, 41, '2025-12-13 04:30:00', 50, 30, 168, 2025),
(48, 5, 4, 1, 'Spring', 56, 42, '2025-04-21 04:30:00', 51, 30, 184, 2025),
(49, 6, 4, 1, 'Fall', 50, 32, '2022-09-15 04:30:00', 45, 30, 250, 2022),
(50, 6, 4, 1, 'Winter', 52, 35, '2022-12-10 04:30:00', 46, 30, 268, 2022),
(51, 6, 4, 1, 'Spring', 48, 30, '2022-04-20 04:30:00', 44, 30, 236, 2022),
(52, 6, 4, 1, 'Fall', 50, 37, '2023-09-14 04:30:00', 47, 30, 248, 2023),
(53, 6, 4, 1, 'Winter', 49, 36, '2023-12-12 04:30:00', 43, 30, 222, 2023),
(54, 6, 4, 1, 'Spring', 51, 38, '2023-04-18 04:30:00', 45, 30, 279, 2023),
(55, 6, 4, 1, 'Fall', 53, 39, '2024-09-16 04:30:00', 48, 30, 235, 2024),
(56, 6, 4, 1, 'Winter', 50, 37, '2024-12-11 04:30:00', 47, 30, 271, 2024),
(57, 6, 4, 1, 'Spring', 52, 40, '2024-04-19 04:30:00', 46, 30, 239, 2024),
(58, 6, 4, 1, 'Fall', 55, 42, '2025-09-17 04:30:00', 49, 30, 269, 2025),
(59, 6, 4, 1, 'Winter', 54, 43, '2025-12-13 04:30:00', 50, 30, 278, 2025),
(60, 6, 4, 1, 'Spring', 56, 44, '2025-04-21 04:30:00', 51, 30, 273, 2025),
(61, 7, 4, 1, 'Fall', 50, 30, '2022-09-15 04:30:00', 45, 30, 137, 2022),
(62, 7, 4, 1, 'Winter', 52, 33, '2022-12-10 04:30:00', 46, 30, 114, 2022),
(63, 7, 4, 1, 'Spring', 48, 29, '2022-04-20 04:30:00', 44, 30, 124, 2022),
(64, 7, 4, 1, 'Fall', 50, 34, '2023-09-14 04:30:00', 47, 30, 148, 2023),
(65, 7, 4, 1, 'Winter', 49, 33, '2023-12-12 04:30:00', 43, 30, 145, 2023),
(66, 7, 4, 1, 'Spring', 51, 35, '2023-04-18 04:30:00', 45, 30, 132, 2023),
(67, 7, 4, 1, 'Fall', 53, 36, '2024-09-16 04:30:00', 48, 30, 156, 2024),
(68, 7, 4, 1, 'Winter', 50, 34, '2024-12-11 04:30:00', 47, 30, 144, 2024),
(69, 7, 4, 1, 'Spring', 52, 37, '2024-04-19 04:30:00', 46, 30, 131, 2024),
(70, 7, 4, 1, 'Fall', 55, 39, '2025-09-17 04:30:00', 49, 30, 136, 2025),
(71, 7, 4, 1, 'Winter', 54, 40, '2025-12-13 04:30:00', 50, 30, 146, 2025),
(72, 7, 4, 1, 'Spring', 56, 41, '2025-04-21 04:30:00', 51, 30, 166, 2025),
(73, 2, 4, 1, 'Spring', 10, 8, '2025-08-26 11:40:45', 1, 30, 260, 2025),
(74, 2, 6, 1, 'Spring', 10, 0, '2025-08-28 06:25:45', NULL, 30, NULL, 2025),
(75, 2, 6, 1, 'Spring', 10, 0, '2025-08-28 06:28:41', NULL, 30, NULL, 2025),
(76, 2, 6, 1, 'Spring', 10, 0, '2025-08-28 06:29:15', NULL, 30, NULL, 2025),
(77, 2, 6, 1, 'Spring', 10, 0, '2025-08-28 06:29:16', NULL, 30, NULL, 2025),
(78, 5, 6, 1, 'Spring', 10, 0, '2025-08-28 06:40:58', NULL, 30, NULL, 2025),
(79, 5, 6, 1, 'Spring', 10, 0, '2025-08-28 06:41:12', NULL, 30, NULL, 2025),
(80, 5, 6, 1, 'Spring', 10, 0, '2025-08-28 06:41:23', NULL, 30, NULL, 2025),
(81, 5, 6, 1, 'Spring', 10, 0, '2025-08-28 06:41:35', NULL, 30, NULL, 2025),
(82, 5, 6, 1, 'Spring', 10, 0, '2025-08-28 06:54:30', NULL, 30, NULL, 2025),
(83, 3, 4, NULL, 'Spring', 10, 0, '2025-08-28 09:05:23', NULL, 30, NULL, 2025),
(84, 2, 4, NULL, 'Spring', 10, 0, '2025-08-28 09:20:13', NULL, 30, NULL, 2025),
(85, 2, 6, NULL, 'Spring', 10, 0, '2025-08-28 09:22:07', NULL, 30, NULL, 2025),
(86, 2, 4, NULL, 'Spring', 10, 0, '2025-08-28 09:25:04', NULL, 30, NULL, 2025),
(87, 2, 4, NULL, 'Spring', 10, 0, '2025-08-28 09:28:32', NULL, 30, NULL, 2025),
(88, 2, 4, NULL, 'Spring', 10, 0, '2025-08-28 09:31:59', NULL, 30, NULL, 2025),
(89, 2, 4, NULL, 'Spring', 10, 7, '2025-08-28 10:56:22', 1, 30, 270, 2025),
(90, 2, 4, NULL, 'Spring', 10, 0, '2025-08-28 11:04:20', NULL, 30, NULL, 2025),
(91, 2, 4, NULL, 'Spring', 10, 8, '2025-08-28 11:09:52', 1, 30, 290, 2025),
(92, 2, 4, NULL, 'Spring', 15, 13, '2025-08-29 05:41:57', 2, 5, 340, 2025),
(93, 2, 4, NULL, 'Spring', 15, 0, '2025-08-29 05:51:05', NULL, 5, NULL, 2025),
(94, 2, 4, NULL, 'Spring', 15, 0, '2025-08-29 05:52:36', NULL, 5, NULL, 2025),
(95, 2, 4, NULL, 'Spring', 15, 0, '2025-08-29 05:57:13', NULL, 5, NULL, 2025);

-- --------------------------------------------------------

--
-- Table structure for table `assessment_configurations`
--

DROP TABLE IF EXISTS `assessment_configurations`;
CREATE TABLE IF NOT EXISTS `assessment_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `time_limit_minutes` int NOT NULL DEFAULT '30',
  `question_count` int NOT NULL DEFAULT '10',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_subject_unique` (`grade_id`,`subject_id`),
  KEY `idx_config_grade` (`grade_id`),
  KEY `idx_config_subject` (`subject_id`),
  KEY `idx_config_active` (`is_active`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_configurations`
--

INSERT INTO `assessment_configurations` (`id`, `grade_id`, `subject_id`, `time_limit_minutes`, `question_count`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 5, 15, 1, '2025-08-28 14:18:34', '2025-08-28 14:18:34');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_responses`
--

DROP TABLE IF EXISTS `assessment_responses`;
CREATE TABLE IF NOT EXISTS `assessment_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assessment_id` int NOT NULL,
  `question_id` int NOT NULL,
  `question_order` int NOT NULL,
  `selected_option_index` int DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `response_time_seconds` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `question_difficulty` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assessment_id` (`assessment_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_responses_question_difficulty` (`question_difficulty`)
) ENGINE=MyISAM AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `assessment_responses`
--

INSERT INTO `assessment_responses` (`id`, `assessment_id`, `question_id`, `question_order`, `selected_option_index`, `is_correct`, `response_time_seconds`, `created_at`, `question_difficulty`) VALUES
(1, 1, 70, 1, 3, 0, NULL, '2025-08-26 08:46:47', 230),
(2, 1, 26, 2, 0, 1, NULL, '2025-08-26 08:46:51', 230),
(3, 1, 101, 3, 0, 1, NULL, '2025-08-26 08:46:59', 230),
(4, 1, 58, 4, 0, 1, NULL, '2025-08-26 08:47:07', 240),
(5, 1, 39, 5, 2, 0, NULL, '2025-08-26 08:47:11', 240),
(6, 1, 83, 6, 0, 1, NULL, '2025-08-26 08:47:15', 240),
(7, 1, 110, 7, 0, 1, NULL, '2025-08-26 08:47:18', 240),
(8, 1, 72, 8, 1, 0, NULL, '2025-08-26 08:47:27', 250),
(9, 1, 52, 9, 0, 1, NULL, '2025-08-26 08:47:37', 250),
(10, 1, 23, 10, 2, 1, NULL, '2025-08-26 08:47:43', 250),
(11, 2, 45, 1, 1, 0, NULL, '2025-08-26 08:49:33', 220),
(12, 2, 13, 2, 2, 1, NULL, '2025-08-26 08:49:36', 220),
(13, 2, 19, 3, 1, 0, NULL, '2025-08-26 08:49:38', 220),
(14, 2, 76, 4, 3, 0, NULL, '2025-08-26 08:49:41', 220),
(15, 2, 63, 5, 1, 0, NULL, '2025-08-26 08:49:44', 210),
(16, 2, 32, 6, 0, 0, NULL, '2025-08-26 08:49:47', 210),
(17, 2, 88, 7, 3, 0, NULL, '2025-08-26 08:49:50', 210),
(18, 2, 40, 8, 0, 1, NULL, '2025-08-26 08:49:56', 200),
(19, 2, 97, 9, 2, 0, NULL, '2025-08-26 08:50:05', 200),
(20, 2, 54, 10, 0, 1, NULL, '2025-08-26 08:50:08', 200),
(21, 73, 110, 1, 0, 1, NULL, '2025-08-26 11:40:52', 240),
(22, 73, 58, 2, 0, 1, NULL, '2025-08-26 11:40:59', 240),
(23, 73, 23, 3, 3, 0, NULL, '2025-08-26 11:41:02', 250),
(24, 73, 39, 4, 0, 1, NULL, '2025-08-26 11:41:10', 240),
(25, 73, 52, 5, 0, 1, NULL, '2025-08-26 11:41:17', 250),
(26, 73, 89, 6, 0, 1, NULL, '2025-08-26 11:41:22', 250),
(27, 73, 17, 7, 2, 1, NULL, '2025-08-26 11:41:28', 250),
(28, 73, 82, 8, 0, 1, NULL, '2025-08-26 11:41:34', 260),
(29, 73, 108, 9, 1, 0, NULL, '2025-08-26 11:41:41', 260),
(30, 73, 64, 10, 0, 1, NULL, '2025-08-26 11:41:46', 260),
(31, 74, 119, 1, 1, 1, NULL, '2025-08-28 06:25:47', 234),
(32, 74, 119, 2, 1, 1, NULL, '2025-08-28 06:25:50', 234),
(33, 75, 119, 1, 1, 0, NULL, '2025-08-28 06:28:45', 240),
(34, 75, 121, 2, 1, 0, NULL, '2025-08-28 06:29:05', 281),
(35, 78, 119, 1, 3, 0, NULL, '2025-08-28 06:41:02', 240),
(36, 78, 120, 2, 2, 1, NULL, '2025-08-28 06:41:06', 178),
(37, 79, 119, 1, 2, 1, NULL, '2025-08-28 06:41:15', 240),
(38, 80, 119, 1, 3, 0, NULL, '2025-08-28 06:41:27', 240),
(39, 80, 120, 2, 2, 1, NULL, '2025-08-28 06:41:30', 178),
(40, 81, 119, 1, 2, 1, NULL, '2025-08-28 06:41:41', 240),
(41, 81, 121, 2, 3, 1, NULL, '2025-08-28 06:41:45', 281),
(42, 83, 35, 1, 1, 0, NULL, '2025-08-28 09:05:27', 170),
(43, 83, 28, 2, 0, 1, NULL, '2025-08-28 09:05:34', 110),
(44, 89, 39, 1, 1, 0, NULL, '2025-08-28 10:56:23', 240),
(45, 89, 101, 2, 3, 0, NULL, '2025-08-28 10:56:26', 230),
(46, 89, 13, 3, 3, 0, NULL, '2025-08-28 10:56:30', 220),
(47, 89, 63, 4, 3, 1, NULL, '2025-08-28 10:56:36', 210),
(48, 89, 19, 5, 2, 1, NULL, '2025-08-28 10:56:44', 220),
(49, 89, 26, 6, 0, 1, NULL, '2025-08-28 10:56:48', 230),
(50, 89, 58, 7, 0, 1, NULL, '2025-08-28 10:56:57', 240),
(51, 89, 17, 8, 2, 1, NULL, '2025-08-28 10:57:02', 250),
(52, 89, 37, 9, 0, 1, NULL, '2025-08-28 10:57:08', 260),
(53, 89, 30, 10, 0, 1, NULL, '2025-08-28 10:57:15', 270),
(54, 91, 58, 1, 0, 1, NULL, '2025-08-28 11:09:55', 240),
(55, 91, 17, 2, 2, 1, NULL, '2025-08-28 11:10:00', 250),
(56, 91, 37, 3, 0, 1, NULL, '2025-08-28 11:10:03', 260),
(57, 91, 30, 4, 3, 0, NULL, '2025-08-28 11:10:13', 270),
(58, 91, 108, 5, 1, 0, NULL, '2025-08-28 11:10:20', 260),
(59, 91, 113, 6, 0, 1, NULL, '2025-08-28 11:10:25', 250),
(60, 91, 64, 7, 0, 1, NULL, '2025-08-28 11:10:30', 260),
(61, 91, 50, 8, 0, 1, NULL, '2025-08-28 11:10:35', 270),
(62, 91, 14, 9, 3, 1, NULL, '2025-08-28 11:10:41', 280),
(63, 91, 31, 10, 0, 1, NULL, '2025-08-28 11:10:49', 290),
(64, 92, 110, 1, 0, 1, NULL, '2025-08-29 05:42:03', 240),
(65, 92, 17, 2, 2, 1, NULL, '2025-08-29 05:42:08', 250),
(66, 92, 37, 3, 0, 1, NULL, '2025-08-29 05:42:12', 260),
(67, 92, 30, 4, 0, 1, NULL, '2025-08-29 05:42:19', 270),
(68, 92, 14, 5, 3, 1, NULL, '2025-08-29 05:42:23', 280),
(69, 92, 31, 6, 0, 1, NULL, '2025-08-29 05:42:31', 290),
(70, 92, 36, 7, 1, 1, NULL, '2025-08-29 05:42:37', 300),
(71, 92, 24, 8, 0, 1, NULL, '2025-08-29 05:42:55', 310),
(72, 92, 34, 9, 0, 0, NULL, '2025-08-29 05:43:01', 320),
(73, 92, 112, 10, 0, 1, NULL, '2025-08-29 05:43:08', 310),
(74, 92, 53, 11, 3, 1, NULL, '2025-08-29 05:43:14', 320),
(75, 92, 41, 12, 0, 1, NULL, '2025-08-29 05:43:19', 330),
(76, 92, 27, 13, 3, 0, NULL, '2025-08-29 05:43:29', 340),
(77, 92, 104, 14, 0, 1, NULL, '2025-08-29 05:43:36', 330),
(78, 92, 47, 15, 0, 1, NULL, '2025-08-29 05:43:42', 340),
(79, 94, 39, 1, 0, 1, NULL, '2025-08-29 05:52:40', 240),
(80, 94, 17, 2, 2, 1, NULL, '2025-08-29 05:52:46', 250),
(81, 94, 37, 3, 0, 1, NULL, '2025-08-29 05:52:49', 260),
(82, 94, 30, 4, 0, 1, NULL, '2025-08-29 05:52:53', 270);

-- --------------------------------------------------------

--
-- Stand-in structure for view `assessment_results`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `assessment_results`;
CREATE TABLE IF NOT EXISTS `assessment_results` (
`id` int
,`student_id` int
,`first_name` varchar(100)
,`last_name` varchar(100)
,`username` varchar(50)
,`school_name` varchar(100)
,`grade_name` varchar(100)
,`subject_id` int
,`subject_name` varchar(100)
,`assessment_period` enum('Fall','Winter','Spring')
,`rit_score` int
,`correct_answers` int
,`total_questions` int
,`date_taken` timestamp
,`duration_minutes` int
,`year` int
);

-- --------------------------------------------------------

--
-- Table structure for table `grades`
--

DROP TABLE IF EXISTS `grades`;
CREATE TABLE IF NOT EXISTS `grades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `grade_level` int DEFAULT NULL COMMENT 'Grade level (1-12) or NULL for non-numeric grades like Pre-K, College, etc.',
  `description` text COLLATE utf8mb4_general_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_name_unique` (`name`),
  UNIQUE KEY `grade_level_unique` (`grade_level`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grades`
--

INSERT INTO `grades` (`id`, `name`, `display_name`, `grade_level`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'grade-1', 'Grade 1', 1, 'First grade - Elementary school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(2, 'grade-2', 'Grade 2', 2, 'Second grade - Elementary school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(3, 'grade-3', 'Grade 3', NULL, 'Third grade - Elementary school', 1, '2025-08-28 07:00:57', '2025-08-28 07:42:46'),
(4, 'grade-4', 'Grade 4', 4, 'Fourth grade - Elementary school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(5, 'grade-5', 'Grade 5', 5, 'Fifth grade - Elementary school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(6, 'grade-6', 'Grade 6', 6, 'Sixth grade - Middle school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(7, 'grade-7', 'Grade 7', 7, 'Seventh grade - Middle school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(8, 'grade-8', 'Grade 8', 8, 'Eighth grade - Middle school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(9, 'grade-9', 'Grade 9', 9, 'Ninth grade - High school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(10, 'grade-10', 'Grade 10', 10, 'Tenth grade - High school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(11, 'grade-11', 'Grade 11', 11, 'Eleventh grade - High school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57'),
(12, 'grade-12', 'Grade 12', 12, 'Twelfth grade - High school', 1, '2025-08-28 07:00:57', '2025-08-28 07:00:57');

-- --------------------------------------------------------

--
-- Table structure for table `grade_subjects`
--

DROP TABLE IF EXISTS `grade_subjects`;
CREATE TABLE IF NOT EXISTS `grade_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grade_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `is_required` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_subject_unique` (`grade_id`,`subject_id`),
  KEY `idx_grade_subjects_grade` (`grade_id`),
  KEY `idx_grade_subjects_subject` (`subject_id`)
) ENGINE=MyISAM AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grade_subjects`
--

INSERT INTO `grade_subjects` (`id`, `grade_id`, `subject_id`, `is_required`, `created_at`, `updated_at`) VALUES
(1, 1, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(2, 1, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(3, 1, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(4, 2, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(5, 2, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(6, 2, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(7, 3, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(8, 3, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(9, 3, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(10, 4, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(11, 4, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(12, 4, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(13, 5, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(14, 5, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(15, 5, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(16, 6, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(17, 6, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(18, 6, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(19, 7, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(20, 7, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(21, 7, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(22, 8, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(23, 8, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(24, 8, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(25, 9, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(26, 9, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(27, 9, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(28, 10, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(29, 10, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(30, 10, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(31, 11, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(32, 11, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(33, 11, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(34, 12, 3, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(35, 12, 4, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(36, 12, 6, 1, '2025-08-28 07:02:32', '2025-08-28 07:02:32');

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
CREATE TABLE IF NOT EXISTS `questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject_id` int NOT NULL,
  `grade_id` int DEFAULT NULL,
  `question_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `options` json NOT NULL,
  `correct_option_index` int NOT NULL,
  `difficulty_level` int NOT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_subject_difficulty` (`subject_id`,`difficulty_level`),
  KEY `idx_questions_grade` (`grade_id`),
  KEY `idx_questions_subject_grade` (`subject_id`,`grade_id`),
  KEY `idx_questions_grade_difficulty` (`grade_id`,`difficulty_level`),
  KEY `idx_questions_comprehensive` (`subject_id`,`grade_id`,`difficulty_level`)
) ENGINE=MyISAM AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `questions`
--

INSERT INTO `questions` (`id`, `subject_id`, `grade_id`, `question_text`, `options`, `correct_option_index`, `difficulty_level`, `created_by`, `created_at`, `updated_at`) VALUES
(5, 3, 1, 'Mitochondria is ______ of the cell.', '[\"Brain\", \"Powerhouse\", \"Nucleus\", \"Factory\"]', 1, 167, 1, '2025-08-25 11:36:41', '2025-08-28 07:02:32'),
(6, 3, 1, 'The gas essential for breathing is ______', '[\"Carbon dioxide\", \"Nitrogen\", \"Oxygen\", \"Hydrogen\"]', 2, 216, 1, '2025-08-25 12:02:41', '2025-08-28 07:02:32'),
(7, 3, 1, 'The largest planet in our solar system is ______.', '[\"Earth\", \"Saturn\", \"Mars\", \"Jupiter\"]', 3, 257, 1, '2025-08-25 12:03:25', '2025-08-28 07:02:32'),
(8, 3, 1, 'The center of an atom is called the ______.', '[\"Nucleus\", \"Proton\", \"Neutron\", \"Electron\"]', 0, 200, 1, '2025-08-25 12:04:12', '2025-08-28 07:02:32'),
(9, 3, 1, 'Water boils at ______ °C (at sea level).', '[\"50\", \"0\", \"100\", \"125\"]', 2, 129, 1, '2025-08-25 12:05:10', '2025-08-28 07:02:32'),
(10, 3, 1, 'dfdsfshgfsdhfdhsb', '[\"dfsfsf\", \"fddfgg\", \"fsfdfdf\", \"fgfg\"]', 0, 233, 1, '2025-08-25 12:17:46', '2025-08-28 07:02:32'),
(12, 4, 1, 'What does CPU stand for?', '[\"Central Processing Unit\", \"Computer Personal Unit\", \"Central Process Unit\", \"Central Processor Unit\"]', 0, 150, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(13, 4, 1, 'Which of the following is a volatile memory?', '[\"ROM\", \"HDD\", \"RAM\", \"SSD\"]', 2, 220, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(14, 4, 1, 'What is the main function of an Operating System?', '[\"To manage hardware and software resources\", \"To provide a user interface\", \"To run applications\", \"All of the above\"]', 3, 280, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(15, 4, 1, 'Which of the following is not an input device?', '[\"Keyboard\", \"Mouse\", \"Monitor\", \"Scanner\"]', 2, 120, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(16, 4, 1, 'What does \'URL\' stand for?', '[\"Uniform Resource Locator\", \"Universal Resource Locator\", \"Uniform Resource Link\", \"Universal Resource Link\"]', 0, 180, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(17, 4, 1, 'Which programming language is known as the language of the web?', '[\"Python\", \"Java\", \"JavaScript\", \"C++\"]', 2, 250, 1, '2025-08-25 12:41:09', '2025-08-28 07:02:32'),
(18, 4, 1, 'What does CPU stand for?', '[\"Central Processing Unit\", \"Computer Personal Unit\", \"Central Process Unit\", \"Central Processor Unit\"]', 0, 150, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(19, 4, 1, 'Which of the following is a volatile memory?', '[\"ROM\", \"HDD\", \"RAM\", \"SSD\"]', 2, 220, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(20, 4, 1, 'What is the main function of an Operating System?', '[\"To manage hardware and software resources\", \"To provide a user interface\", \"To run applications\", \"All of the above\"]', 3, 280, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(21, 4, 1, 'Which of the following is not an input device?', '[\"Keyboard\", \"Mouse\", \"Monitor\", \"Scanner\"]', 2, 120, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(22, 4, 1, 'What does \'URL\' stand for?', '[\"Uniform Resource Locator\", \"Universal Resource Locator\", \"Uniform Resource Link\", \"Universal Resource Link\"]', 0, 180, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(23, 4, 1, 'Which programming language is known as the language of the web?', '[\"Python\", \"Java\", \"JavaScript\", \"C++\"]', 2, 250, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(24, 4, 1, 'What is the binary equivalent of the decimal number 10?', '[\"1010\", \"1100\", \"1001\", \"1110\"]', 0, 310, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(25, 4, 1, 'Which of the following is a type of computer network?', '[\"LAN\", \"WAN\", \"MAN\", \"All of the above\"]', 3, 190, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(26, 4, 1, 'What does \'HTTP\' stand for?', '[\"HyperText Transfer Protocol\", \"HyperText Transmission Protocol\", \"HyperText Transfer Page\", \"HyperText Transmission Page\"]', 0, 230, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(27, 4, 1, 'Which company developed the first graphical user interface (GUI)?', '[\"Microsoft\", \"Apple\", \"Xerox\", \"IBM\"]', 2, 340, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(28, 4, 2, 'What is the file extension for a Python source file?', '[\".py\", \".java\", \".js\", \".c\"]', 0, 110, 1, '2025-08-25 12:42:57', '2025-08-28 08:14:27'),
(29, 4, 1, 'Which of the following is not a web browser?', '[\"Chrome\", \"Firefox\", \"Safari\", \"Apache\"]', 3, 160, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(30, 4, 1, 'What does \'SQL\' stand for?', '[\"Structured Query Language\", \"Standard Query Language\", \"Simple Query Language\", \"System Query Language\"]', 0, 270, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(31, 4, 1, 'What is the purpose of a firewall?', '[\"To protect a network from unauthorized access\", \"To speed up internet connection\", \"To store data\", \"To create websites\"]', 0, 290, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(32, 4, 1, 'Which of the following is a cloud computing service?', '[\"Amazon Web Services (AWS)\", \"Microsoft Azure\", \"Google Cloud Platform (GCP)\", \"All of the above\"]', 3, 210, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(33, 4, 1, 'What does \'IP\' stand for in IP address?', '[\"Internet Protocol\", \"Internet Provider\", \"Internal Protocol\", \"Internal Provider\"]', 0, 140, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(34, 4, 1, 'Which of the following is a version control system?', '[\"Git\", \"Subversion\", \"Mercurial\", \"All of the above\"]', 3, 320, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(35, 4, 1, 'What is the main component of a computer that executes instructions?', '[\"CPU\", \"RAM\", \"Motherboard\", \"Hard Drive\"]', 0, 170, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(36, 4, 1, 'Which data structure uses a Last-In, First-Out (LIFO) approach?', '[\"Queue\", \"Stack\", \"Array\", \"Linked List\"]', 1, 300, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(37, 4, 1, 'What does \'BIOS\' stand for?', '[\"Basic Input/Output System\", \"Binary Input/Output System\", \"Basic Internal Operating System\", \"Binary Internal Operating System\"]', 0, 260, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(38, 4, 1, 'Which of the following is a markup language?', '[\"HTML\", \"CSS\", \"JavaScript\", \"Python\"]', 0, 130, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(39, 4, 1, 'What is the function of a router in a network?', '[\"To connect different networks together\", \"To amplify the signal\", \"To filter network traffic\", \"To store data\"]', 0, 240, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(40, 4, 1, 'What is \'malware\'?', '[\"Malicious software\", \"Hardware malfunction\", \"A type of computer network\", \"A programming language\"]', 0, 200, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(41, 4, 1, 'What does \'SaaS\' stand for?', '[\"Software as a Service\", \"System as a Service\", \"Software as a System\", \"System as a Software\"]', 0, 330, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(42, 4, 1, 'Which of the following is a component of the CPU?', '[\"ALU\", \"Control Unit\", \"Registers\", \"All of the above\"]', 3, 350, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(43, 4, 1, 'What is the purpose of an algorithm?', '[\"To solve a problem step-by-step\", \"To store data\", \"To display information\", \"To connect to the internet\"]', 0, 180, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(44, 4, 1, 'Which of the following is a database management system?', '[\"MySQL\", \"PostgreSQL\", \"MongoDB\", \"All of the above\"]', 3, 280, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(45, 4, 1, 'What is the term for a set of rules that governs the communication between computers on a network?', '[\"Protocol\", \"Algorithm\", \"Syntax\", \"Program\"]', 0, 220, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(46, 4, 1, 'What does \'GUI\' stand for?', '[\"Graphical User Interface\", \"General User Interface\", \"Graphical Utility Interface\", \"General Utility Interface\"]', 0, 150, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(47, 4, 1, 'Which layer of the OSI model is responsible for routing?', '[\"Network Layer\", \"Data Link Layer\", \"Transport Layer\", \"Physical Layer\"]', 0, 340, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(48, 4, 1, 'What is the primary purpose of an index in a database?', '[\"To speed up data retrieval\", \"To ensure data integrity\", \"To store backup data\", \"To create user accounts\"]', 0, 310, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(49, 4, 1, 'Which of the following is an example of an open-source operating system?', '[\"Linux\", \"Windows\", \"macOS\", \"iOS\"]', 0, 190, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(50, 4, 1, 'What is the function of a compiler?', '[\"To convert source code into machine code\", \"To debug code\", \"To run code\", \"To write code\"]', 0, 270, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(51, 4, 1, 'What does \'DNS\' stand for?', '[\"Domain Name System\", \"Digital Network System\", \"Domain Naming Service\", \"Digital Naming Service\"]', 0, 230, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(52, 4, 1, 'What is the term for a small piece of data sent from a website and stored on the user\'s computer by the user\'s web browser?', '[\"Cookie\", \"Cache\", \"Session\", \"Script\"]', 0, 250, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(53, 4, 1, 'Which of the following is a characteristic of object-oriented programming?', '[\"Inheritance\", \"Encapsulation\", \"Polymorphism\", \"All of the above\"]', 3, 320, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(54, 4, 1, 'What is the purpose of the \'ping\' command?', '[\"To test the reachability of a host on an IP network\", \"To download a file\", \"To send an email\", \"To create a directory\"]', 0, 200, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(55, 4, 1, 'Which of the following is not a programming paradigm?', '[\"Imperative\", \"Declarative\", \"Object-Oriented\", \"Algorithmic\"]', 3, 330, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(56, 4, 1, 'What is the smallest unit of data in a computer?', '[\"Bit\", \"Byte\", \"Nibble\", \"Word\"]', 0, 110, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(57, 4, 1, 'Which of the following is a network topology?', '[\"Star\", \"Bus\", \"Ring\", \"All of the above\"]', 3, 160, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(58, 4, 1, 'What is the function of the \'motherboard\' in a computer?', '[\"To connect all the components of the computer\", \"To process data\", \"To store data permanently\", \"To display output\"]', 0, 240, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(59, 4, 1, 'What does \'API\' stand for?', '[\"Application Programming Interface\", \"Application Program Interface\", \"Applied Programming Interface\", \"Applied Program Interface\"]', 0, 290, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(60, 4, 1, 'What is the purpose of an \'if\' statement in programming?', '[\"To execute a block of code only if a certain condition is true\", \"To loop through a block of code\", \"To define a function\", \"To store a value\"]', 0, 170, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(61, 4, 1, 'Which data structure is used to implement a recursive function call?', '[\"Stack\", \"Queue\", \"Tree\", \"Graph\"]', 0, 350, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(62, 4, 1, 'What is the process of finding and fixing errors in a program called?', '[\"Debugging\", \"Compiling\", \"Running\", \"Testing\"]', 0, 140, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(63, 4, 1, 'Which of the following is a way to represent a color in web design?', '[\"Hex code\", \"RGB value\", \"Color name\", \"All of the above\"]', 3, 210, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(64, 4, 1, 'What is \'phishing\'?', '[\"A fraudulent attempt to obtain sensitive information\", \"A type of computer virus\", \"A method of data encryption\", \"A network protocol\"]', 0, 260, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(65, 4, 1, 'What is the difference between \'==\' and \'===\' in JavaScript?', '[\"\'==\' performs type coercion, while \'===\' does not\", \"\'===\' performs type coercion, while \'==\' does not\", \"There is no difference\", \"They are used for different data types\"]', 0, 300, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(66, 4, 1, 'What does \'CSS\' stand for?', '[\"Cascading Style Sheets\", \"Creative Style Sheets\", \"Computer Style Sheets\", \"Colorful Style Sheets\"]', 0, 120, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(67, 4, 1, 'What is the purpose of a \'for\' loop in programming?', '[\"To iterate over a sequence of elements\", \"To make a decision\", \"To define a reusable block of code\", \"To handle errors\"]', 0, 180, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(68, 4, 1, 'Which of the following is an example of a compiled programming language?', '[\"C++\", \"Python\", \"JavaScript\", \"Ruby\"]', 0, 280, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(69, 4, 1, 'What is the function of a DHCP server?', '[\"To automatically assign IP addresses to devices on a network\", \"To resolve domain names to IP addresses\", \"To store and serve web pages\", \"To filter network traffic\"]', 0, 310, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(70, 4, 1, 'What is the term for a program that replicates itself and spreads to other computers?', '[\"Worm\", \"Virus\", \"Trojan horse\", \"Spyware\"]', 0, 230, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(71, 4, 1, 'What is the purpose of a \'function\' in programming?', '[\"To group a set of statements to perform a specific task\", \"To store a collection of data\", \"To control the flow of execution\", \"To define a new data type\"]', 0, 150, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(72, 4, 1, 'Which of the following is not a data type in JavaScript?', '[\"Character\", \"String\", \"Number\", \"Boolean\"]', 0, 250, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(73, 4, 1, 'What does \'LAN\' stand for?', '[\"Local Area Network\", \"Large Area Network\", \"Logical Area Network\", \"Linked Area Network\"]', 0, 130, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(74, 4, 1, 'What is the difference between a \'class\' and an \'object\' in object-oriented programming?', '[\"A class is a blueprint, while an object is an instance of a class\", \"An object is a blueprint, while a class is an instance of an object\", \"They are the same thing\", \"A class is a function, while an object is a variable\"]', 0, 340, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(75, 4, 1, 'What is the command to list files in a directory in a Unix-like operating system?', '[\"ls\", \"dir\", \"list\", \"show\"]', 0, 190, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(76, 4, 1, 'What is the purpose of the \'alt\' attribute in an HTML \'img\' tag?', '[\"To provide alternative text for an image if it cannot be displayed\", \"To set the alignment of the image\", \"To define the source of the image\", \"To specify the width and height of the image\"]', 0, 220, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(77, 4, 1, 'What is \'big data\'?', '[\"Extremely large data sets that may be analyzed computationally to reveal patterns, trends, and associations\", \"A type of database\", \"A programming language\", \"A hardware component\"]', 0, 270, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(78, 4, 1, 'What is the term for a visual representation of a program\'s logic?', '[\"Flowchart\", \"Pseudocode\", \"Algorithm\", \"Diagram\"]', 0, 160, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(79, 4, 1, 'Which of the following is a type of software testing?', '[\"Unit testing\", \"Integration testing\", \"System testing\", \"All of the above\"]', 3, 290, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(80, 4, 1, 'What is the function of a \'switch\' statement in programming?', '[\"To select one of many code blocks to be executed\", \"To create a loop\", \"To define a variable\", \"To handle an error\"]', 0, 200, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(81, 4, 1, 'What is \'machine learning\'?', '[\"A field of artificial intelligence that uses statistical techniques to give computer systems the ability to \'learn\' from data\", \"A type of computer hardware\", \"A network protocol\", \"A graphical user interface\"]', 0, 320, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(82, 4, 1, 'What is the purpose of the \'git clone\' command?', '[\"To create a copy of a remote repository on your local machine\", \"To create a new branch\", \"To commit changes to a repository\", \"To push changes to a remote repository\"]', 0, 260, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(83, 4, 1, 'What does \'IDE\' stand for?', '[\"Integrated Development Environment\", \"Internal Development Environment\", \"Integrated Design Environment\", \"Internal Design Environment\"]', 0, 240, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(84, 4, 1, 'What is \'recursion\'?', '[\"A function calling itself\", \"A loop that never ends\", \"A type of data structure\", \"A sorting algorithm\"]', 0, 330, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(85, 4, 1, 'Which of the following is a web framework for Python?', '[\"Django\", \"Flask\", \"Pyramid\", \"All of the above\"]', 3, 300, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(86, 4, 1, 'What is the \'cloud\' in cloud computing?', '[\"A network of remote servers hosted on the Internet to store, manage, and process data\", \"A type of personal computer\", \"A physical storage device\", \"A software application\"]', 0, 170, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(87, 4, 1, 'What is the purpose of a \'try-catch\' block in programming?', '[\"To handle exceptions or errors that may occur in the code\", \"To create a loop\", \"To define a function\", \"To declare a variable\"]', 0, 280, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(88, 4, 1, 'What is the difference between \'HTTP\' and \'HTTPS\'?', '[\"HTTPS is a secure version of HTTP\", \"HTTP is a secure version of HTTPS\", \"There is no difference\", \"They are used for different types of websites\"]', 0, 210, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(89, 4, 1, 'What is the term for a unique identifier for a row in a database table?', '[\"Primary Key\", \"Foreign Key\", \"Index\", \"Field\"]', 0, 250, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(90, 4, 1, 'Which of the following is a mobile operating system?', '[\"Android\", \"iOS\", \"Both A and B\", \"None of the above\"]', 2, 110, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(91, 4, 1, 'What is \'open source\' software?', '[\"Software with source code that anyone can inspect, modify, and enhance\", \"Software that is free to use\", \"Software that is available online\", \"Software that is easy to use\"]', 0, 180, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(92, 4, 1, 'What is the purpose of a \'constructor\' in object-oriented programming?', '[\"To initialize the state of an object when it is created\", \"To destroy an object when it is no longer needed\", \"To define the methods of a class\", \"To create a copy of an object\"]', 0, 350, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(93, 4, 1, 'Which of the following is a type of computer memory?', '[\"Cache\", \"RAM\", \"ROM\", \"All of the above\"]', 3, 140, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(94, 4, 1, 'What is the command to create a new directory in a Unix-like operating system?', '[\"mkdir\", \"newdir\", \"createdir\", \"md\"]', 0, 190, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(95, 4, 1, 'What is the purpose of an \'array\' in programming?', '[\"To store a collection of elements of the same data type\", \"To perform mathematical calculations\", \"To define the structure of a program\", \"To handle user input\"]', 0, 160, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(96, 4, 1, 'What is the \'Internet of Things\' (IoT)?', '[\"A network of physical devices, vehicles, home appliances and other items embedded with electronics, software, sensors, actuators, and connectivity which enables these objects to connect and exchange data\", \"A new version of the internet\", \"A type of social media platform\", \"A virtual reality technology\"]', 0, 320, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(97, 4, 1, 'What is the term for a software program that is designed to damage or disrupt a computer system?', '[\"Virus\", \"Firewall\", \"Antivirus\", \"Operating System\"]', 0, 200, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(98, 4, 1, 'Which of the following is a front-end JavaScript framework?', '[\"React\", \"Angular\", \"Vue.js\", \"All of the above\"]', 3, 310, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(99, 4, 1, 'What is the purpose of a \'variable\' in programming?', '[\"To store a value that can be changed\", \"To perform a specific action\", \"To define a constant value\", \"To organize code\"]', 0, 120, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(100, 4, 1, 'What is the difference between \'let\' and \'const\' in JavaScript?', '[\"\'let\' allows you to reassign the variable, while \'const\' does not\", \"\'const\' allows you to reassign the variable, while \'let\' does not\", \"There is no difference\", \"They are used for different scopes\"]', 0, 270, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(101, 4, 1, 'What is the term for the process of converting data into a format that cannot be easily understood by unauthorized parties?', '[\"Encryption\", \"Decryption\", \"Compression\", \"Decompression\"]', 0, 230, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(102, 4, 1, 'Which of the following is a sorting algorithm?', '[\"Bubble Sort\", \"Merge Sort\", \"Quick Sort\", \"All of the above\"]', 3, 290, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(103, 4, 1, 'What is the function of the \'this\' keyword in JavaScript?', '[\"It refers to the object that is executing the current function\", \"It refers to the global object\", \"It refers to the parent object\", \"It is a placeholder for a value\"]', 0, 340, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(104, 4, 1, 'What is \'agile\' software development?', '[\"An iterative and incremental approach to software development\", \"A linear and sequential approach to software development\", \"A methodology that focuses on extensive documentation\", \"A process that involves minimal customer feedback\"]', 0, 330, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(105, 4, 1, 'What does \'WAN\' stand for?', '[\"Wide Area Network\", \"Wireless Area Network\", \"Wired Area Network\", \"World Area Network\"]', 0, 150, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(106, 4, 1, 'What is the purpose of a \'cookie\' on a website?', '[\"To store user information on the user\'s computer\", \"To display advertisements\", \"To play videos\", \"To create animations\"]', 0, 220, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(107, 4, 1, 'Which of the following is a NoSQL database?', '[\"MongoDB\", \"Cassandra\", \"Redis\", \"All of the above\"]', 3, 300, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(108, 4, 1, 'What is the \'DOM\' in web development?', '[\"Document Object Model\", \"Data Object Model\", \"Design Object Model\", \"Display Object Model\"]', 0, 260, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(109, 4, 1, 'What is the command to display the current working directory in a Unix-like operating system?', '[\"pwd\", \"cwd\", \"dir\", \"path\"]', 0, 180, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(110, 4, 1, 'What is \'pair programming\'?', '[\"An agile software development technique in which two programmers work together at one workstation\", \"A method of programming with a partner\", \"A way to debug code with another person\", \"A process of reviewing code written by a colleague\"]', 0, 240, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(111, 4, 1, 'Which of the following is a back-end programming language?', '[\"Node.js\", \"PHP\", \"Ruby on Rails\", \"All of the above\"]', 3, 280, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(112, 4, 1, 'What is the purpose of a \'foreign key\' in a database?', '[\"To link two tables together\", \"To uniquely identify a record in a table\", \"To speed up data retrieval\", \"To enforce data integrity\"]', 0, 310, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(113, 4, 1, 'What is \'responsive web design\'?', '[\"A web design approach that makes web pages render well on a variety of devices and window or screen sizes\", \"A web design that responds quickly to user input\", \"A web design that uses a lot of animations and transitions\", \"A web design that is easy to navigate\"]', 0, 250, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(114, 4, 1, 'What is the term for a collection of related web pages?', '[\"Website\", \"Web server\", \"Web browser\", \"Web application\"]', 0, 110, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(115, 4, 1, 'What is the purpose of a \'version control system\'?', '[\"To track changes to files over time\", \"To store different versions of a software application\", \"To collaborate with other developers on a project\", \"All of the above\"]', 3, 270, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(116, 4, 1, 'What is the difference between \'null\' and \'undefined\' in JavaScript?', '[\"\'null\' is an assigned value, while \'undefined\' means a variable has been declared but has not yet been assigned a value\", \"\'undefined\' is an assigned value, while \'null\' means a variable has been declared but has not yet been assigned a value\", \"They are the same\", \"They are used for different data types\"]', 0, 350, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(117, 4, 1, 'What is \'cybersecurity\'?', '[\"The practice of protecting systems, networks, and programs from digital attacks\", \"A type of computer software\", \"A career in the tech industry\", \"A method of data storage\"]', 0, 170, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(118, 4, 1, 'What is the purpose of a \'break\' statement in a loop?', '[\"To terminate the loop\", \"To skip the current iteration and continue with the next one\", \"To pause the execution of the loop\", \"To restart the loop\"]', 0, 190, 1, '2025-08-25 12:42:57', '2025-08-28 07:02:32'),
(119, 6, 1, 'What is the Square root of 27', '[\"1\", \"2\", \"3\", \"4\"]', 2, 240, 1, '2025-08-28 06:25:28', '2025-08-28 07:02:32'),
(120, 6, 1, 'What is 4+1 equals to', '[\"2\", \"1\", \"5\", \"4\"]', 2, 178, 1, '2025-08-28 06:27:03', '2025-08-28 07:02:32'),
(121, 6, 1, 'If f(n) = n⁵ – n, for n ϵ N, then f(n) is divisible by', '[\"25\", \"32\", \"43\", \"30\"]', 3, 281, 1, '2025-08-28 06:28:07', '2025-08-28 07:02:32');

-- --------------------------------------------------------

--
-- Stand-in structure for view `question_info`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `question_info`;
CREATE TABLE IF NOT EXISTS `question_info` (
`id` int
,`question_text` text
,`options` json
,`correct_option_index` int
,`difficulty_level` int
,`subject_id` int
,`subject_name` varchar(100)
,`grade_id` int
,`grade_name` varchar(50)
,`grade_display_name` varchar(100)
,`grade_level` int
,`created_by` int
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
CREATE TABLE IF NOT EXISTS `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `contact_email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_name_unique` (`name`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `name`, `address`, `contact_email`, `contact_phone`, `created_at`, `updated_at`) VALUES
(1, 'Lincoln Elementary School', '123 Main Street, City, State 12345', 'info@lincolnelementary.edu', '(555) 123-4567', '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(3, 'Jefferson High School', '789 Pine Road, City, State 12345', 'info@jeffersonhigh.edu', '(555) 345-6789', '2025-08-28 07:02:32', '2025-08-28 07:02:32'),
(4, 'Manarat Al-Madinah School', 'Al-Khalidiyah District of Al-Madinah Al-Munawarah, Saudi Arabia', 'info@manaratalmadinah.com', '(555) 456-7890', '2025-08-28 07:02:32', '2025-08-28 07:21:25'),
(5, 'Saudi International School', 'Abi Al Abbas Al Shafei Street, Hiteen District, Riyadh, Kingdom of Saudi Arabia', 'admin@saudiinternational.com', '123123123', '2025-08-28 07:20:11', '2025-08-28 07:20:11');

-- --------------------------------------------------------

--
-- Table structure for table `school_administrators`
--

DROP TABLE IF EXISTS `school_administrators`;
CREATE TABLE IF NOT EXISTS `school_administrators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('principal','vice_principal','coordinator','teacher') COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_user_unique` (`school_id`,`user_id`),
  KEY `idx_school_admin_school` (`school_id`),
  KEY `idx_school_admin_user` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `student_info`
-- (See below for the actual view)
--
DROP VIEW IF EXISTS `student_info`;
CREATE TABLE IF NOT EXISTS `student_info` (
`id` int
,`username` varchar(50)
,`first_name` varchar(100)
,`last_name` varchar(100)
,`role` enum('admin','student')
,`school_name` varchar(100)
,`school_id` int
,`grade_name` varchar(50)
,`grade_display_name` varchar(100)
,`grade_level` int
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(4, 'Computer Science', 'Computer science and technology concepts assessment', '2025-08-25 12:28:05', '2025-08-25 12:28:05'),
(3, 'Science', 'Science concepts and scientific reasoning assessment', '2025-08-25 09:11:41', '2025-08-25 09:11:41'),
(6, 'Maths', 'Mathematics', '2025-08-28 06:14:26', '2025-08-28 06:14:26');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','student') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `grade_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_users_school` (`school_id`),
  KEY `idx_users_grade` (`grade_id`),
  KEY `idx_users_school_grade` (`school_id`,`grade_id`),
  KEY `idx_users_comprehensive` (`role`,`school_id`,`grade_id`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `first_name`, `last_name`, `school_id`, `grade_id`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2a$12$utUHQt62Ha25Q4D463yfAulVM7PpkUZB/gGGyOypCRd42C55UlciS', 'admin', 'System', 'Administrator', NULL, NULL, '2025-08-25 08:54:07', '2025-08-28 13:02:55'),
(2, 'student1', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'One', 5, 1, '2025-08-25 08:54:07', '2025-08-29 05:41:54'),
(3, 'student2', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Two', 4, 2, '2025-08-25 08:54:07', '2025-08-28 09:05:20'),
(4, 'student3', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Three', 1, 1, '2025-08-26 09:30:29', '2025-08-28 07:02:32'),
(5, 'student4', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Four', 1, 1, '2025-08-26 09:30:29', '2025-08-28 07:02:32'),
(6, 'student5', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Five', 1, 1, '2025-08-26 09:30:29', '2025-08-28 07:02:32'),
(7, 'student6', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Six', 1, 1, '2025-08-26 09:30:29', '2025-08-28 07:02:32'),
(8, 'student7', '$2a$12$/ylwHiqD54XyNtdu3NAUauO5xvsfgyNkM5mXb5AWNjFJIGc3p3XW6', 'student', 'Student', 'Seven', 1, 1, '2025-08-26 09:30:29', '2025-08-28 07:02:32');

-- --------------------------------------------------------

--
-- Structure for view `assessment_results`
--
DROP TABLE IF EXISTS `assessment_results`;

DROP VIEW IF EXISTS `assessment_results`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `assessment_results`  AS SELECT `a`.`id` AS `id`, `a`.`student_id` AS `student_id`, `u`.`first_name` AS `first_name`, `u`.`last_name` AS `last_name`, `u`.`username` AS `username`, `s`.`name` AS `school_name`, `g`.`display_name` AS `grade_name`, `a`.`subject_id` AS `subject_id`, `sub`.`name` AS `subject_name`, `a`.`assessment_period` AS `assessment_period`, `a`.`rit_score` AS `rit_score`, `a`.`correct_answers` AS `correct_answers`, `a`.`total_questions` AS `total_questions`, `a`.`date_taken` AS `date_taken`, `a`.`duration_minutes` AS `duration_minutes`, `a`.`year` AS `year` FROM ((((`assessments` `a` left join `users` `u` on((`a`.`student_id` = `u`.`id`))) left join `schools` `s` on((`u`.`school_id` = `s`.`id`))) left join `grades` `g` on((`a`.`grade_id` = `g`.`id`))) left join `subjects` `sub` on((`a`.`subject_id` = `sub`.`id`))) WHERE (`a`.`rit_score` is not null) ;

-- --------------------------------------------------------

--
-- Structure for view `question_info`
--
DROP TABLE IF EXISTS `question_info`;

DROP VIEW IF EXISTS `question_info`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `question_info`  AS SELECT `q`.`id` AS `id`, `q`.`question_text` AS `question_text`, `q`.`options` AS `options`, `q`.`correct_option_index` AS `correct_option_index`, `q`.`difficulty_level` AS `difficulty_level`, `q`.`subject_id` AS `subject_id`, `sub`.`name` AS `subject_name`, `q`.`grade_id` AS `grade_id`, `g`.`name` AS `grade_name`, `g`.`display_name` AS `grade_display_name`, `g`.`grade_level` AS `grade_level`, `q`.`created_by` AS `created_by`, `q`.`created_at` AS `created_at` FROM ((`questions` `q` left join `subjects` `sub` on((`q`.`subject_id` = `sub`.`id`))) left join `grades` `g` on((`q`.`grade_id` = `g`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `student_info`
--
DROP TABLE IF EXISTS `student_info`;

DROP VIEW IF EXISTS `student_info`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `student_info`  AS SELECT `u`.`id` AS `id`, `u`.`username` AS `username`, `u`.`first_name` AS `first_name`, `u`.`last_name` AS `last_name`, `u`.`role` AS `role`, `s`.`name` AS `school_name`, `s`.`id` AS `school_id`, `g`.`name` AS `grade_name`, `g`.`display_name` AS `grade_display_name`, `g`.`grade_level` AS `grade_level`, `u`.`created_at` AS `created_at` FROM ((`users` `u` left join `schools` `s` on((`u`.`school_id` = `s`.`id`))) left join `grades` `g` on((`u`.`grade_id` = `g`.`id`))) WHERE (`u`.`role` = 'student') ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
