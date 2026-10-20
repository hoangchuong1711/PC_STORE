-- T21: add short review videos without changing already-applied migrations.
ALTER TABLE media_assets ADD COLUMN duration_second INTEGER;
ALTER TABLE media_assets DROP CONSTRAINT ck_media_details;
ALTER TABLE media_assets ADD CONSTRAINT ck_media_details CHECK (
    status IN ('UPLOADING', 'DELETE_PENDING', 'DELETED') OR
    (cloudinary_asset_id IS NOT NULL AND size_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL
     AND ((mime_type = 'image/jpeg' AND duration_second IS NULL)
          OR (mime_type = 'video/mp4' AND module = 'REVIEW' AND duration_second BETWEEN 1 AND 10)))
);
