-- T21: V5 may already exist in local databases. Extend it without changing its checksum.
ALTER TABLE media_assets DROP CONSTRAINT media_assets_status_check;
ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_status
    CHECK (status IN ('UPLOADING', 'TEMP', 'ATTACHED', 'DELETE_PENDING', 'DELETED'));
ALTER TABLE media_assets DROP CONSTRAINT ck_media_details;
ALTER TABLE media_assets ADD CONSTRAINT ck_media_details CHECK (
    status IN ('UPLOADING', 'DELETE_PENDING', 'DELETED') OR
    (cloudinary_asset_id IS NOT NULL AND mime_type = 'image/jpeg'
     AND size_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL));
ALTER TABLE media_assets ADD COLUMN cleanup_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (cleanup_attempts >= 0);
ALTER TABLE media_assets ADD COLUMN next_cleanup_at TIMESTAMP WITHOUT TIME ZONE;
CREATE INDEX ix_media_assets_retry ON media_assets(status, next_cleanup_at);
