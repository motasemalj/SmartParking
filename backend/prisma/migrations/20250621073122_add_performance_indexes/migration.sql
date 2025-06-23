-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_plateId_idx" ON "Activity"("plateId");

-- CreateIndex
CREATE INDEX "Activity_timestamp_idx" ON "Activity"("timestamp");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_userId_timestamp_idx" ON "Activity"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Document_plateId_idx" ON "Document"("plateId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Entry_plateId_idx" ON "Entry"("plateId");

-- CreateIndex
CREATE INDEX "Entry_userId_idx" ON "Entry"("userId");

-- CreateIndex
CREATE INDEX "Entry_timestamp_idx" ON "Entry"("timestamp");

-- CreateIndex
CREATE INDEX "Entry_type_idx" ON "Entry"("type");

-- CreateIndex
CREATE INDEX "Entry_userId_timestamp_idx" ON "Entry"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Plate_userId_idx" ON "Plate"("userId");

-- CreateIndex
CREATE INDEX "Plate_status_idx" ON "Plate"("status");

-- CreateIndex
CREATE INDEX "Plate_type_idx" ON "Plate"("type");

-- CreateIndex
CREATE INDEX "Plate_plateCode_plateNumber_idx" ON "Plate"("plateCode", "plateNumber");

-- CreateIndex
CREATE INDEX "Plate_expiresAt_idx" ON "Plate"("expiresAt");

-- CreateIndex
CREATE INDEX "Plate_createdAt_idx" ON "Plate"("createdAt");

-- CreateIndex
CREATE INDEX "Plate_status_type_expiresAt_idx" ON "Plate"("status", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "Security_name_idx" ON "Security"("name");

-- CreateIndex
CREATE INDEX "TemporaryAccess_plateCode_plateNumber_idx" ON "TemporaryAccess"("plateCode", "plateNumber");

-- CreateIndex
CREATE INDEX "TemporaryAccess_status_idx" ON "TemporaryAccess"("status");

-- CreateIndex
CREATE INDEX "TemporaryAccess_expiresAt_idx" ON "TemporaryAccess"("expiresAt");

-- CreateIndex
CREATE INDEX "TemporaryAccess_createdById_idx" ON "TemporaryAccess"("createdById");

-- CreateIndex
CREATE INDEX "TemporaryAccess_status_expiresAt_idx" ON "TemporaryAccess"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_userType_idx" ON "User"("userType");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
