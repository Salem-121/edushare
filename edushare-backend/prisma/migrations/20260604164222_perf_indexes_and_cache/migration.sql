-- AlterTable
ALTER TABLE `lesson` ADD COLUMN `extractedText` LONGTEXT NULL;

-- CreateIndex
CREATE INDEX `Lesson_createdAt_idx` ON `Lesson`(`createdAt`);

-- CreateIndex
CREATE INDEX `Notification_userId_read_idx` ON `Notification`(`userId`, `read`);

-- CreateIndex
CREATE INDEX `Notification_userId_createdAt_idx` ON `Notification`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Summary_userId_createdAt_idx` ON `Summary`(`userId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Summary_lessonId_status_idx` ON `Summary`(`lessonId`, `status`);

-- CreateIndex
CREATE INDEX `Summary_status_idx` ON `Summary`(`status`);
