package com.pcstore.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in only: uses a tiny real Cloudinary asset and deletes it in finally. */
class CloudinaryLiveSmokeTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_CLOUDINARY_SMOKE", matches = "true")
    void roundTripsAuthenticatedImageAndDeletesIt() throws Exception {
        var storage = new CloudinaryImageStorage(System.getenv("CLOUDINARY_CLOUD_NAME"),
                System.getenv("CLOUDINARY_API_KEY"), System.getenv("CLOUDINARY_API_SECRET"));
        String publicId = "pcstore/temp/setup/" + UUID.randomUUID();
        var source = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", source);
        byte[] image = new MediaImageService().prepare(source.toByteArray(), "image/png").bytes();
        try {
            var stored = storage.upload(image, publicId);
            byte[] delivered = storage.download(stored.assetId(), 1_000_000);
            assertTrue(delivered.length > 2);
            assertEquals(0xff, delivered[0] & 0xff);
            assertEquals(0xd8, delivered[1] & 0xff);
        } finally {
            storage.delete(publicId);
        }
    }
}
