import { NextResponse } from "next/server";
import { buildFacebookPublishPayload, dataUrlToFilePart } from "@/lib/facebook-publisher";
import { getStoredFacebookProviderToken } from "@/lib/facebook-provider-token-store";
import {
  getMetaManagedPages,
  metaErrorResponse,
  publishMetaPageFeedPost,
  publishMetaPageMultiPhotoPost,
  publishMetaPagePhotoPost,
  uploadMetaPageUnpublishedPhoto
} from "@/lib/meta/facebook";
import { createAdminClient } from "@/lib/supabase/admin";

type ScheduleSettingRow = {
  user_id: string;
  page_id: string;
  daily_post_count: number;
  schedule_times: string[];
  timezone?: string | null;
};

type DraftRow = {
  id: string;
  page_id?: string | null;
  status?: string | null;
  draft_json?: unknown;
  created_at?: string | null;
};

type ScheduledRow = {
  id: string;
};

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Thiếu CRON_SECRET cho lịch tự động.");
    return;
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new Error("Unauthorized cron request.");
  }
}

function buildSaigonScheduledTime(slot: string, dayOffset: number) {
  const [hourRaw, minuteRaw] = slot.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const now = new Date();
  const saigonNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const utc = Date.UTC(
    saigonNow.getUTCFullYear(),
    saigonNow.getUTCMonth(),
    saigonNow.getUTCDate() + dayOffset,
    hour - 7,
    minute,
    0,
    0
  );

  return new Date(utc).toISOString();
}

function buildFutureSaigonSchedule(slots: string[], count: number, offset: number) {
  const cutoff = Date.now() + 15 * 60_000;
  const futureSlots: string[] = [];

  for (let dayOffset = 0; futureSlots.length < count + offset && dayOffset < 90; dayOffset += 1) {
    for (const slot of slots) {
      const scheduled = buildSaigonScheduledTime(slot, dayOffset);
      if (new Date(scheduled).getTime() > cutoff) futureSlots.push(scheduled);
      if (futureSlots.length >= count + offset) break;
    }
  }

  return futureSlots.slice(offset, offset + count);
}

async function publishDraftToMeta({
  draft,
  pageId,
  pageAccessToken
}: {
  draft: unknown;
  pageId: string;
  pageAccessToken: string;
}) {
  const payload = buildFacebookPublishPayload(draft, { approved: true, pageId });

  if (payload.mode === "photo") {
    const filePart = payload.imageDataUrl ? dataUrlToFilePart(payload.imageDataUrl) : null;
    const result = await publishMetaPagePhotoPost({
      pageId: payload.pageId,
      caption: payload.caption,
      imageUrl: payload.imageUrl,
      imageBlob: filePart?.blob,
      fileName: filePart?.fileName,
      scheduledPublishTime: payload.scheduledPublishTime,
      accessToken: pageAccessToken
    });

    return {
      mode: "photo",
      page_id: payload.pageId,
      photo_id: result.id,
      post_id: result.post_id || result.id,
      scheduled_publish_time: payload.scheduledPublishTime
    };
  }

  if (payload.mode === "multi_photo") {
    const uploadedPhotos = [];
    for (const [index, media] of payload.media.entries()) {
      const filePart = media.dataUrl ? dataUrlToFilePart(media.dataUrl) : null;
      const photo = await uploadMetaPageUnpublishedPhoto({
        pageId: payload.pageId,
        imageUrl: media.url,
        imageBlob: filePart?.blob,
        fileName: filePart ? `agent-post-image-${index + 1}.${filePart.fileName.split(".").pop() || "png"}` : undefined,
        accessToken: pageAccessToken
      });
      uploadedPhotos.push(photo);
    }

    const result = await publishMetaPageMultiPhotoPost({
      pageId: payload.pageId,
      message: payload.message,
      mediaFbids: uploadedPhotos.map((photo) => photo.id),
      scheduledPublishTime: payload.scheduledPublishTime,
      accessToken: pageAccessToken
    });

    return {
      mode: "photo",
      page_id: payload.pageId,
      photo_id: uploadedPhotos[0]?.id,
      post_id: result.id,
      photo_ids: uploadedPhotos.map((photo) => photo.id),
      scheduled_publish_time: payload.scheduledPublishTime
    };
  }

  const result = await publishMetaPageFeedPost({
    pageId: payload.pageId,
    message: payload.message,
    link: payload.link,
    scheduledPublishTime: payload.scheduledPublishTime,
    accessToken: pageAccessToken
  });

  return {
    mode: "feed",
    page_id: payload.pageId,
    post_id: result.id,
    scheduled_publish_time: payload.scheduledPublishTime
  };
}

export async function GET(request: Request) {
  try {
    assertCronAuthorized(request);
    const admin = createAdminClient();
    const { data: settings, error: settingsError } = await admin
      .from("facebook_publisher_schedule_settings")
      .select("user_id,page_id,daily_post_count,schedule_times,timezone")
      .eq("active", true)
      .limit(50);

    if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

    const results = [];
    for (const setting of (settings ?? []) as ScheduleSettingRow[]) {
      const token = await getStoredFacebookProviderToken(setting.user_id);
      if (!token?.accessToken) {
        results.push({ user_id: setting.user_id, status: "skipped", reason: "missing_facebook_token" });
        continue;
      }

      const pages = await getMetaManagedPages(token.accessToken);
      const pageAccessToken = pages.find((page) => page.id === setting.page_id)?.access_token;
      if (!pageAccessToken) {
        results.push({ user_id: setting.user_id, status: "skipped", reason: "missing_page_token" });
        continue;
      }

      const scheduleTimes = (setting.schedule_times?.length ? setting.schedule_times : ["09:00", "14:00", "20:00"]).slice(
        0,
        setting.daily_post_count || 3
      );
      const { data: scheduledRows } = await admin
        .from("facebook_post_drafts")
        .select("id")
        .eq("user_id", setting.user_id)
        .eq("status", "scheduled");
      const scheduleOffset = ((scheduledRows ?? []) as ScheduledRow[]).length;
      const { data: drafts, error: draftsError } = await admin
        .from("facebook_post_drafts")
        .select("id,page_id,status,draft_json,created_at")
        .eq("user_id", setting.user_id)
        .in("status", ["draft", "queued", "failed"])
        .order("created_at", { ascending: true })
        .limit(20);

      if (draftsError) {
        results.push({ user_id: setting.user_id, status: "failed", reason: draftsError.message });
        continue;
      }

      let scheduledCount = 0;
      const scheduledTimes = buildFutureSaigonSchedule(scheduleTimes, ((drafts ?? []) as DraftRow[]).length, scheduleOffset);
      for (const [index, draftRow] of ((drafts ?? []) as DraftRow[]).entries()) {
        const scheduledPublishTime = scheduledTimes[index];
        if (!scheduledPublishTime) break;
        const draftJson =
          typeof draftRow.draft_json === "object" && draftRow.draft_json
            ? { ...draftRow.draft_json, scheduledPublishTime }
            : { scheduledPublishTime };

        const publishResult = await publishDraftToMeta({
          draft: draftJson,
          pageId: setting.page_id,
          pageAccessToken
        });

        const { error: updateError } = await admin
          .from("facebook_post_drafts")
          .update({
            status: "scheduled",
            page_id: setting.page_id,
            publish_result_json: publishResult
          })
          .eq("id", draftRow.id)
          .eq("user_id", setting.user_id);

        if (updateError) throw updateError;
        scheduledCount += 1;
      }

      results.push({ user_id: setting.user_id, status: "ok", scheduled: scheduledCount });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized cron request.") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = metaErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
