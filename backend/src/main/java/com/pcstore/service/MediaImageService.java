package com.pcstore.service;

import com.pcstore.exception.AppException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/** Validates and strips metadata from a single user image before it reaches storage. */
public final class MediaImageService {
    private static final int MAX_INPUT_BYTES = 8_000_000;
    private static final int MAX_OUTPUT_BYTES = 1_000_000;
    private static final int MAX_EDGE = 10_000;
    private static final long MAX_PIXELS = 25_000_000L;
    private static final int OUTPUT_EDGE = 1_920;

    public record PreparedImage(byte[] bytes, String mimeType, int width, int height) { }

    public PreparedImage prepare(byte[] input, String claimedMimeType) {
        if (input == null || input.length == 0) throw invalid();
        if (input.length > MAX_INPUT_BYTES) throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh vượt giới hạn 8 MB.");
        String actual = detectMime(input);
        if (actual == null || !actual.equals(claimedMimeType)) throw invalid();
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw invalid();
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || width > MAX_EDGE || height > MAX_EDGE
                        || (long) width * height > MAX_PIXELS) throw invalid();
                BufferedImage decoded = reader.read(0);
                if (decoded == null) throw invalid();
                double scale = Math.min(1.0, (double) OUTPUT_EDGE / Math.max(width, height));
                int targetWidth = Math.max(1, (int) Math.round(width * scale));
                int targetHeight = Math.max(1, (int) Math.round(height * scale));
                BufferedImage normalized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = normalized.createGraphics();
                try {
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, targetWidth, targetHeight);
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    graphics.drawImage(decoded, 0, 0, targetWidth, targetHeight, null);
                } finally {
                    graphics.dispose();
                }
                for (float quality : new float[]{0.82f, 0.68f, 0.50f}) {
                    byte[] output = encodeJpeg(normalized, quality);
                    if (output.length <= MAX_OUTPUT_BYTES) {
                        return new PreparedImage(output, "image/jpeg", targetWidth, targetHeight);
                    }
                }
                throw new AppException(413, "MEDIA_TOO_LARGE", "Ảnh sau xử lý vượt giới hạn 1 MB.");
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException error) {
            if (error instanceof AppException appError) throw appError;
            throw invalid();
        }
    }

    private static byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        var bytes = new ByteArrayOutputStream();
        var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam parameters = writer.getDefaultWriteParam();
            parameters.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            parameters.setCompressionQuality(quality);
            writer.write(null, new javax.imageio.IIOImage(image, null, null), parameters);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }

    private static String detectMime(byte[] input) {
        if (input.length >= 3 && (input[0] & 0xff) == 0xff && (input[1] & 0xff) == 0xd8 && (input[2] & 0xff) == 0xff)
            return "image/jpeg";
        if (input.length >= 8 && (input[0] & 0xff) == 0x89 && input[1] == 'P' && input[2] == 'N'
                && input[3] == 'G' && input[4] == 13 && input[5] == 10 && input[6] == 26 && input[7] == 10)
            return "image/png";
        return null;
    }

    private static AppException invalid() {
        return new AppException(400, "INVALID_MEDIA", "Ảnh phải là JPEG hoặc PNG hợp lệ.");
    }
}
