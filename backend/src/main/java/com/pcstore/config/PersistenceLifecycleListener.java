package com.pcstore.config;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import com.pcstore.service.CloudinaryImageStorage;
import com.pcstore.service.MediaCleanupScheduler;
import com.pcstore.service.MediaCleanupService;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@WebListener
public class PersistenceLifecycleListener implements ServletContextListener {
    private MediaCleanupScheduler cleanup;
    private MediaCleanupScheduler orderExpirationScheduler;

    @Override
    public void contextInitialized(ServletContextEvent event) {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        try {
            orderExpirationScheduler = new MediaCleanupScheduler(() -> {
                try {
                    new com.pcstore.service.OrderExpirationService(PersistenceManager.get()).expirePendingOrders();
                } catch (RuntimeException error) {
                    event.getServletContext().log("Order expiration check failed; will retry", error);
                }
            }, Duration.ofMinutes(1));
            orderExpirationScheduler.start();
        } catch (RuntimeException error) {
            event.getServletContext().log("Failed to start order expiration scheduler", error);
        }

        String cloud = System.getenv("CLOUDINARY_CLOUD_NAME");
        String key = System.getenv("CLOUDINARY_API_KEY");
        String secret = System.getenv("CLOUDINARY_API_SECRET");
        if (cloud == null || cloud.isBlank() || key == null || key.isBlank() || secret == null || secret.isBlank()) return;
        var storage = new CloudinaryImageStorage(cloud, key, secret);
        cleanup = new MediaCleanupScheduler(() -> {
            try {
                new MediaCleanupService(PersistenceManager.get(), storage).runOnce(LocalDateTime.now(ZoneOffset.UTC));
            } catch (RuntimeException error) {
                event.getServletContext().log("Media cleanup failed; will retry", error);
            }
        }, Duration.ofMinutes(15));
        cleanup.start();
    }

    @Override
    public void contextDestroyed(ServletContextEvent event) {
        if (orderExpirationScheduler != null) orderExpirationScheduler.close();
        if (cleanup != null) cleanup.close();
        PersistenceManager.close();
    }
}
