package com.pcstore.controller;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MediaContentServletTest {
    @Test void parsesBoundedBrowserRangesAndRejectsInvalidRanges() {
        assertEquals(new MediaContentServlet.ByteRange(0, 99), MediaContentServlet.parseRange("bytes=0-99", 1000));
        assertEquals(new MediaContentServlet.ByteRange(900, 999), MediaContentServlet.parseRange("bytes=-100", 1000));
        assertEquals(new MediaContentServlet.ByteRange(500, 999), MediaContentServlet.parseRange("bytes=500-", 1000));
        assertNull(MediaContentServlet.parseRange(null, 1000));
        assertThrows(IllegalArgumentException.class, () -> MediaContentServlet.parseRange("bytes=1000-", 1000));
        assertThrows(IllegalArgumentException.class, () -> MediaContentServlet.parseRange("bytes=0-5,7-9", 1000));
    }
}
