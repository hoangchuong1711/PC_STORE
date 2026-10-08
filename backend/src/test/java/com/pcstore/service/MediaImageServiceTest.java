package com.pcstore.service;

import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class MediaImageServiceTest {
    private final MediaImageService service = new MediaImageService();

    @Test void normalizesPortraitPngIntoBoundedJpeg() throws IOException {
        var source = new BufferedImage(100, 200, BufferedImage.TYPE_INT_RGB);
        var graphics = source.createGraphics();
        graphics.setColor(Color.BLUE);
        graphics.fillRect(0, 0, 100, 200);
        graphics.dispose();
        var output = service.prepare(png(source), "image/png");
        assertEquals("image/jpeg", output.mimeType());
        assertEquals(100, output.width());
        assertEquals(200, output.height());
        assertTrue(output.bytes().length > 0 && output.bytes().length <= 1_000_000);
        assertEquals(0xff, output.bytes()[0] & 0xff);
        assertEquals(0xd8, output.bytes()[1] & 0xff);
    }

    @Test void rejectsFakeImageEvenWhenClaimedPng() {
        var error = assertThrows(AppException.class, () -> service.prepare("not an image".getBytes(), "image/png"));
        assertEquals("INVALID_MEDIA", error.getCode());
    }

    @Test void rejectsMismatchedContentType() throws IOException {
        var error = assertThrows(AppException.class, () -> service.prepare(png(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB)), "image/jpeg"));
        assertEquals("INVALID_MEDIA", error.getCode());
    }

    @Test void rejectsOversizedInputBeforeDecode() {
        var error = assertThrows(AppException.class, () -> service.prepare(new byte[8_000_001], "image/png"));
        assertEquals(413, error.getStatus());
    }


    private static byte[] png(BufferedImage image) throws IOException {
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
