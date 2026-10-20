package com.pcstore.service;

import com.pcstore.exception.AppException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MediaVideoServiceTest {
    private static final String VALID = """
            {"streams":[{"codec_name":"h264","codec_type":"video","width":1280,"height":720,"avg_frame_rate":"30/1"},
                        {"codec_name":"aac","codec_type":"audio"}],
             "format":{"format_name":"mov,mp4,m4a,3gp,3g2,mj2","duration":"9.8"}}
            """;

    @Test void validatesActualProbeMetadataAndRejectsOversizedDuration() {
        assertEquals(10, MediaVideoService.validateProbe(VALID).durationSecond());
        assertEquals("MEDIA_VIDEO_DURATION", assertThrows(AppException.class,
                () -> MediaVideoService.validateProbe(VALID.replace("9.8", "10.1"))).getCode());
        assertEquals("INVALID_MEDIA", assertThrows(AppException.class,
                () -> MediaVideoService.validateProbe(VALID.replace("h264", "hevc"))).getCode());
        assertEquals("INVALID_MEDIA", assertThrows(AppException.class,
                () -> MediaVideoService.validateProbe(VALID.replace("aac", "opus"))).getCode());
    }

    @Test void refusesNonVideoAndLargeInputBeforeLaunchingFfmpeg() {
        var video = new MediaVideoService();
        assertEquals("INVALID_MEDIA", assertThrows(AppException.class,
                () -> video.prepare(new byte[]{1, 2, 3}, "video/mp4")).getCode());
        assertEquals("MEDIA_TOO_LARGE", assertThrows(AppException.class,
                () -> video.prepare(new byte[20_000_001], "video/mp4")).getCode());
    }
}
