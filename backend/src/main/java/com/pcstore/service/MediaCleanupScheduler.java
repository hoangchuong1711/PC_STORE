package com.pcstore.service;

import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** Runs cleanup promptly on startup and then at a fixed delay. */
public final class MediaCleanupScheduler implements AutoCloseable {
    private final Runnable task;
    private final long intervalMillis;
    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "pcstore-media-cleanup");
        thread.setDaemon(true);
        return thread;
    });
    private boolean started;
    private boolean closed;

    // Nhận công việc chạy nền và khoảng nghỉ giữa hai lần chạy, yêu cầu khoảng nghỉ dương.
    public MediaCleanupScheduler(Runnable task, Duration interval) {
        if (task == null || interval == null || interval.isZero() || interval.isNegative())
            throw new IllegalArgumentException("Cleanup task and positive interval are required");
        this.task = task;
        this.intervalMillis = interval.toMillis();
    }

    // Chạy công việc ngay rồi lặp lại sau mỗi khoảng nghỉ; lỗi một lượt không dừng lịch sau.
    public synchronized void start() {
        if (started || closed) throw new IllegalStateException("Cleanup scheduler already started or closed");
        started = true;
        executor.scheduleWithFixedDelay(() -> {
            try { task.run(); }
            catch (RuntimeException ignored) { /* Listener task logs the failure; keep future runs alive. */ }
        }, 0, intervalMillis, TimeUnit.MILLISECONDS);
    }

    // Dừng bộ lập lịch và yêu cầu ngắt công việc đang chạy khi ứng dụng đóng.
    @Override public synchronized void close() {
        closed = true;
        executor.shutdownNow();
    }
}
