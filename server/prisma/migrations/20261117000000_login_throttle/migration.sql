CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "failures" TIMESTAMP(3)[] NOT NULL DEFAULT ARRAY[]::TIMESTAMP(3)[],
    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);
