import { AlbumType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLineMessagingConfig } from "@/lib/services/systemSettingService";

export interface LineAlbumNotificationPayload {
  albumCode: string;
  title: string;
  description?: string | null;
  albumType: AlbumType;
  photoCount: number;
  totalSizeBytes?: bigint | number;
  eventDate: Date;
  coverThumbnailUrl?: string | null;
  divisionName?: string | null;
  departmentName?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
}

/**
 * Format bytes to human readable format (MB, GB)
 */
function formatFileSize(bytes?: bigint | number): string {
  if (!bytes) return "0 MB";
  const num = typeof bytes === "bigint" ? Number(bytes) : bytes;
  const mb = num / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Format Date to Thai Buddhist format e.g. "15 ต.ค. 2569"
 */
function formatThaiDate(date: Date): string {
  const d = new Date(date);
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return `${day} ${month} ${thaiYear}`;
}

/**
 * Album type labels and theme colors
 */
const ALBUM_TYPE_BADGES: Record<
  AlbumType,
  { label: string; bgColor: string; textColor: string }
> = {
  [AlbumType.PROJECT]: {
    label: "โครงการตามแผน (SmartFlow)",
    bgColor: "#0891B2",
    textColor: "#FFFFFF",
  },
  [AlbumType.ROUTINE]: {
    label: "งานประจำ / หน้าเสาธง",
    bgColor: "#10B981",
    textColor: "#FFFFFF",
  },
  [AlbumType.ADHOC]: {
    label: "กิจกรรมเร่งด่วน / เฉพาะกิจ",
    bgColor: "#F59E0B",
    textColor: "#FFFFFF",
  },
  [AlbumType.PORTFOLIO]: {
    label: "คลังภาพ PR วิทยาลัย",
    bgColor: "#6366F1",
    textColor: "#FFFFFF",
  },
};

/**
 * Builds the standard Flex Message payload for an album (used by both Bot Push and LIFF 1-click sharing)
 */
export function buildAlbumFlexMessage(
  album: LineAlbumNotificationPayload,
  options?: { baseUrl?: string; liffId?: string }
): {
  type: "flex";
  altText: string;
  contents: any;
} {
  // Determine public base URL for LINE Flex Message actions
  // Never use raw internal IPs (e.g. 202.29.243.82:3005) or localhost
  let baseUrl = (options?.baseUrl || "https://service.npc.ac.th/npc_photosync").trim();
  const customUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").trim();
  if (
    !options?.baseUrl &&
    customUrl &&
    !customUrl.includes("localhost") &&
    !customUrl.includes("202.29.243.82") &&
    !customUrl.includes(":3005") &&
    !customUrl.includes(":3006") &&
    !customUrl.includes(":3000") &&
    customUrl.startsWith("http")
  ) {
    baseUrl = customUrl.replace(/^http:\/\//i, "https://");
    if (!baseUrl.includes("/npc_photosync")) {
      baseUrl = `${baseUrl}/npc_photosync`;
    }
  }
  baseUrl = baseUrl.replace(/\/+$/, "");

  const liffId = (
    options?.liffId ||
    process.env.NEXT_PUBLIC_LINE_LIFF_ID ||
    process.env.LINE_LIFF_ID ||
    "2012443779-ygwuql9o"
  ).trim();

  const badge = ALBUM_TYPE_BADGES[album.albumType] || {
    label: "กิจกรรมวิทยาลัย",
    bgColor: "#06B6D4",
    textColor: "#FFFFFF",
  };

  let coverUrl = "";
  if (album.coverThumbnailUrl && (album.coverThumbnailUrl.startsWith("https://") || album.coverThumbnailUrl.startsWith("http://"))) {
    coverUrl = album.coverThumbnailUrl.replace(/^http:\/\//i, "https://");
  } else if (album.coverThumbnailUrl) {
    const cleanPath = album.coverThumbnailUrl.startsWith("/")
      ? album.coverThumbnailUrl
      : `/${album.coverThumbnailUrl}`;

    if (cleanPath.startsWith("/npc_photosync/")) {
      coverUrl = `https://service.npc.ac.th${cleanPath}`;
    } else {
      coverUrl = `${baseUrl}${cleanPath}`;
    }
  } else {
    // High-quality fallback HTTPS cover image
    coverUrl = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
  }

  // Ensure coverUrl is strictly https://
  if (!coverUrl.startsWith("https://")) {
    coverUrl = coverUrl.replace(/^http:\/\//i, "https://");
  }

  // If this is a mock test album with no DB match, link to main PhotoSync gallery
  // Real albums link directly to their own album page (/albums/[albumCode])
  let albumPageUrl = album.albumCode.startsWith("TEST-")
    ? `${baseUrl}?openExternalBrowser=1`
    : `${baseUrl}/albums/${album.albumCode}?openExternalBrowser=1`;

  if (!albumPageUrl.startsWith("https://")) {
    albumPageUrl = albumPageUrl.replace(/^http:\/\//i, "https://");
  }
  const thaiDateStr = formatThaiDate(album.eventDate);
  const sizeStr = formatFileSize(album.totalSizeBytes);

  // LIFF Share Target Picker URL:
  // Direct link to LINE LIFF app, which prompts user to select groups/friends to send this exact Flex Message
  const liffShareUrl = album.albumCode.startsWith("TEST-")
    ? `https://liff.line.me/${liffId}?test=1`
    : `https://liff.line.me/${liffId}?albumCode=${encodeURIComponent(album.albumCode)}`;

  // Flex Message Container with Deep Navy & Electric Cyan palette
  const flexContainer = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      paddingAll: "16px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "วิทยาลัยสารพัดช่างน่าน",
              size: "xs",
              color: "#38BDF8",
              weight: "bold",
              flex: 1,
            },
            {
              type: "text",
              text: "NPC_PhotoSync",
              size: "xxs",
              color: "#94A3B8",
              align: "end",
            },
          ],
        },
        {
          type: "text",
          text: album.title,
          size: "md",
          color: "#F8FAFC",
          weight: "bold",
          margin: "sm",
          wrap: true,
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              backgroundColor: badge.bgColor,
              cornerRadius: "6px",
              paddingStart: "8px",
              paddingEnd: "8px",
              paddingTop: "2px",
              paddingBottom: "2px",
              contents: [
                {
                  type: "text",
                  text: badge.label,
                  size: "xxs",
                  color: badge.textColor,
                  weight: "bold",
                },
              ],
            },
            {
              type: "text",
              text: `รหัส: ${album.albumCode}`,
              size: "xs",
              color: "#94A3B8",
              align: "end",
              gravity: "center",
            },
          ],
        },
      ],
    },
    hero: {
      type: "image",
      url: coverUrl,
      size: "full",
      aspectRatio: "16:9",
      aspectMode: "cover",
      action: {
        type: "uri",
        uri: albumPageUrl,
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E293B",
      paddingAll: "16px",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "📅 วันที่จัดกิจกรรม",
              size: "xs",
              color: "#94A3B8",
              flex: 4,
            },
            {
              type: "text",
              text: thaiDateStr,
              size: "xs",
              color: "#E2E8F0",
              weight: "bold",
              align: "end",
              flex: 6,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "📸 จำนวนภาพ / ขนาด",
              size: "xs",
              color: "#94A3B8",
              flex: 4,
            },
            {
              type: "text",
              text: `${album.photoCount} รูป${album.totalSizeBytes ? ` (${sizeStr})` : ""}`,
              size: "xs",
              color: "#E2E8F0",
              align: "end",
              flex: 6,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "🏛️ หน่วยงาน",
              size: "xs",
              color: "#94A3B8",
              flex: 3,
            },
            {
              type: "box",
              layout: "vertical",
              flex: 7,
              contents: [
                {
                  type: "text",
                  text: album.divisionName || "วิทยาลัยสารพัดช่างน่าน",
                  size: "xs",
                  color: "#E2E8F0",
                  align: "end",
                  wrap: true,
                },
                ...(album.departmentName
                  ? [
                      {
                        type: "text" as const,
                        text: `(${album.departmentName})`,
                        size: "xxs" as const,
                        color: "#94A3B8" as const,
                        align: "end" as const,
                        wrap: true,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        ...(album.projectCode
          ? [
              {
                type: "box" as const,
                layout: "horizontal" as const,
                spacing: "sm" as const,
                contents: [
                  {
                    type: "text" as const,
                    text: "🔗 โครงการ",
                    size: "xs" as const,
                    color: "#94A3B8" as const,
                    flex: 3,
                  },
                  {
                    type: "text" as const,
                    text: `${album.projectCode} ${album.projectName || ""}`.trim(),
                    size: "xs" as const,
                    color: "#38BDF8" as const,
                    align: "end" as const,
                    wrap: true,
                    flex: 7,
                  },
                ],
              },
            ]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      backgroundColor: "#0F172A",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06B6D4",
          height: "sm",
          action: {
            type: "uri",
            label: "🌐 เปิดดูภาพและดาวน์โหลด",
            uri: albumPageUrl,
          },
        },
        {
          type: "button",
          style: "primary",
          color: "#10B981",
          height: "sm",
          action: {
            type: "uri",
            label: "↗️ แชร์ต่อลงกลุ่ม LINE อื่น",
            uri: liffShareUrl,
          },
        },
      ],
    },
  };

  return {
    type: "flex",
    altText: `📢 ภาพกิจกรรมใหม่: ${album.title} (${album.photoCount} รูป)`,
    contents: flexContainer,
  };
}

/**
 * Sends a modern LINE Flex Message notification to the specified group or channel
 */
export async function sendNewAlbumFlexMessage(
  album: LineAlbumNotificationPayload,
  overrideConfig?: { token?: string; targetId?: string; bypassEnabledCheck?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getLineMessagingConfig();

  if (!overrideConfig?.bypassEnabledCheck && !config.isEnabled) {
    console.log("[LINE Service] LINE notification is disabled in settings");
    return { success: true, messageId: "skipped_disabled" };
  }

  const token = (overrideConfig?.token || config.channelAccessToken).trim();
  const targetId = (overrideConfig?.targetId || config.targetGroupId).trim();

  // Determine public base URL for LINE Flex Message actions
  let baseUrl = "https://service.npc.ac.th/npc_photosync";
  const customUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "").trim();
  if (
    customUrl &&
    !customUrl.includes("localhost") &&
    !customUrl.includes("202.29.243.82") &&
    !customUrl.includes(":3005") &&
    !customUrl.includes(":3006") &&
    !customUrl.includes(":3000") &&
    customUrl.startsWith("http")
  ) {
    baseUrl = customUrl.replace(/^http:\/\//i, "https://");
    if (!baseUrl.includes("/npc_photosync")) {
      baseUrl = `${baseUrl}/npc_photosync`;
    }
  }
  baseUrl = baseUrl.replace(/\/+$/, "");

  // Graceful fallback for development / test mode without active LINE tokens
  if (
    !token ||
    !targetId ||
    token.includes("mock-") ||
    token.includes("your-line") ||
    targetId.includes("mock-") ||
    targetId.includes("C1234567890")
  ) {
    console.log(
      `[LINE Service Mock] Skipped real push notification for album: ${album.albumCode} ("${album.title}")`
    );
    return { success: true, messageId: `mock_line_msg_${Date.now()}` };
  }

  const flexMessage = buildAlbumFlexMessage(album, {
    baseUrl,
    liffId: config.liffId,
  });

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [flexMessage],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`LINE Messaging API push failed (${res.status}):`, errBody);
      return { success: false, error: errBody };
    }

    return { success: true };
  } catch (error) {
    console.error("LINE Notify Service network exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends a test push message to verify LINE Messaging API credentials and target group.
 * Automatically picks the latest real album in the database so the test is 100% authentic,
 * showing the real event cover photo and linking directly to that specific album page.
 */
export async function sendLineTestMessage(params?: {
  channelAccessToken?: string;
  targetGroupId?: string;
  albumCode?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getLineMessagingConfig();
  const token = (params?.channelAccessToken || config.channelAccessToken).trim();
  const targetId = (params?.targetGroupId || config.targetGroupId).trim();

  if (!token) {
    return { success: false, error: "กรุณาระบุ Channel Access Token ก่อนทดสอบ" };
  }
  if (!targetId) {
    return { success: false, error: "กรุณาระบุ Target Group ID ก่อนทดสอบ" };
  }

  // 1. Attempt to fetch real album from database (specific album or latest uploaded)
  let realAlbumPayload: LineAlbumNotificationPayload | null = null;
  try {
    const album = await prisma.album.findFirst({
      where: params?.albumCode ? { albumCode: params.albumCode } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            projectCode: true,
            projectName: true,
          },
        },
        mediaFiles: {
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
      },
    });

    if (album) {
      const coverUrl =
        album.coverThumbnailUrl ||
        album.mediaFiles[0]?.thumbnailWebpUrl ||
        album.mediaFiles[0]?.reportReadyJpgUrl ||
        null;

      realAlbumPayload = {
        albumCode: album.albumCode,
        title: album.title,
        description: album.description,
        albumType: album.albumType,
        photoCount: album.photoCount,
        totalSizeBytes: album.totalSizeBytes,
        eventDate: album.eventDate,
        coverThumbnailUrl: coverUrl,
        divisionName: album.divisionName,
        departmentName: album.departmentName,
        projectCode: album.project?.projectCode || null,
        projectName: album.project?.projectName || null,
      };
    }
  } catch (err) {
    console.warn("Could not query latest album for test push:", err);
  }

  // 2. Fallback only if database has zero albums yet
  const testPayload: LineAlbumNotificationPayload = realAlbumPayload || {
    albumCode: `TEST-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`,
    title: "🔔 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE Messaging API",
    description: "ทดสอบการส่งข้อความแจ้งเตือนอัตโนมัติจากระบบ NPC_PhotoSync วิทยาลัยสารพัดช่างน่าน การเชื่อมต่อสำเร็จสมบูรณ์พร้อมใช้งาน!",
    albumType: AlbumType.PORTFOLIO,
    photoCount: 1,
    eventDate: new Date(),
    divisionName: "ฝ่ายบริหารทรัพยากร",
    departmentName: "งานศูนย์ดิจิทัลและสื่อสารองค์กร",
    coverThumbnailUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
  };

  return sendNewAlbumFlexMessage(testPayload, {
    token,
    targetId,
    bypassEnabledCheck: true,
  });
}
