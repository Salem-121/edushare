-- CreateTable
CREATE TABLE `PracticeQuiz` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `timeLimit` INTEGER NOT NULL,
    `questions` LONGTEXT NOT NULL,
    `sourceName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `score` INTEGER NULL,
    `correctCount` INTEGER NULL,
    `totalQuestions` INTEGER NULL,
    `answers` LONGTEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `studentId` INTEGER NOT NULL,

    INDEX `PracticeQuiz_studentId_createdAt_idx`(`studentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PracticeQuiz` ADD CONSTRAINT `PracticeQuiz_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
