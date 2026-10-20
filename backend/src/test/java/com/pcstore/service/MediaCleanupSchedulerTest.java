package com.pcstore.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class MediaCleanupSchedulerTest {
    @Test void startsCleanupAndStopsOnClose() throws Exception {
        var ran = new CountDownLatch(1);
        var scheduler = new MediaCleanupScheduler(ran::countDown, Duration.ofMinutes(15));
        scheduler.start();
        try {
            assertTrue(ran.await(2, TimeUnit.SECONDS));
        } finally {
            scheduler.close();
        }
        assertThrows(IllegalStateException.class, scheduler::start);
    }
}
