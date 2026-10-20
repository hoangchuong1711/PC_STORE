package com.pcstore.service;

import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MediaUploadServiceTest {
    @Test void rejectsMissingModuleBeforeProcessingOrDatabaseAccess() {
        MediaUploadService service = new MediaUploadService(null, null, null);
        AppException imageError = assertThrows(AppException.class,
                () -> service.upload(1, null, new byte[0], "image/png"));
        assertEquals(400, imageError.getStatus());
        assertEquals("INVALID_MEDIA_MODULE", imageError.getCode());

        AppException videoError = assertThrows(AppException.class,
                () -> service.uploadVideo(1, null, new byte[0], "video/mp4"));
        assertEquals(400, videoError.getStatus());
        assertEquals("INVALID_MEDIA_MODULE", videoError.getCode());
    }
}
