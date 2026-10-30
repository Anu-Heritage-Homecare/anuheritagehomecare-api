-- CreateTable
CREATE TABLE "task_category_settings" (
    "id" UUID NOT NULL,
    "category" "task_category" NOT NULL,
    "color" VARCHAR(16),
    "icon" VARCHAR(40),
    "autoAssignLabel" VARCHAR(160),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_category_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_category_settings_category_key" ON "task_category_settings"("category");

-- CreateTable
CREATE TABLE "task_priority_settings" (
    "id" UUID NOT NULL,
    "priority" "task_priority" NOT NULL,
    "color" VARCHAR(16),
    "label" VARCHAR(40),
    "slaHours" INTEGER,
    "escalation" VARCHAR(160),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_priority_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_priority_settings_priority_key" ON "task_priority_settings"("priority");

-- CreateTable
CREATE TABLE "task_notification_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_notification_settings_key_key" ON "task_notification_settings"("key");
