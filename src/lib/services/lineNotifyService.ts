import { AlbumType } from "@prisma/client";
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
  // Never use raw internal IPs (e.g. 202.29.243.82:3005) or localhost
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

  const badge = ALBUM_TYPE_BADGES[album.albumType] || {
    label: "กิจกรรมวิทยาลัย",
    bgColor: "#06B6D4",
    textColor: "#FFFFFF",
  };

  let coverUrl = "";
  if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("https://")) {
    coverUrl = album.coverThumbnailUrl;
  } else if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("http://")) {
    coverUrl = album.coverThumbnailUrl.replace(/^http:\/\//i, "https://");
  } else if (album.coverThumbnailUrl && album.coverThumbnailUrl.startsWith("/")) {
    coverUrl = `${baseUrl}${album.coverThumbnailUrl}`;
  } else {
    // High-quality, reliable default HTTPS cover image for college events
    coverUrl = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
  }

  // Ensure coverUrl is strictly https://
  if (!coverUrl.startsWith("https://")) {
    coverUrl = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";
  }

  // If this is a test album, link directly to the main PhotoSync gallery
  // Append openExternalBrowser=1 so LINE automatically launches default browser (Chrome/Safari)
  let albumPageUrl = album.albumCode.startsWith("TEST-")
    ? `${baseUrl}?openExternalBrowser=1`
    : `${baseUrl}/albums/${album.albumCode}?openExternalBrowser=1`;

  if (!albumPageUrl.startsWith("https://")) {
    albumPageUrl = albumPageUrl.replace(/^http:\/\//i, "https://");
  }
  const thaiDateStr = formatThaiDate(album.eventDate);
  const sizeStr = formatFileSize(album.totalSizeBytes);

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
          layout: "baseline",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "📅 วันที่จัดกิจกรรม",
              color: "#94A3B8",
              size: "xs",
              flex: 2,
            },
            {
              type: "text",
              text: thaiDateStr,
              wrap: true,
              color: "#F1F5F9",
              size: "xs",
              flex: 3,
            },
          ],
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "📸 จำนวนภาพ / ขนาด",
              color: "#94A3B8",
              size: "xs",
              flex: 2,
            },
            {
              type: "text",
              text: `${album.photoCount} รูป (${sizeStr})`,
              wrap: true,
              color: "#F1F5F9",
              size: "xs",
              flex: 3,
            },
          ],
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: "🏛️ หน่วยงาน",
              color: "#94A3B8",
              size: "xs",
              flex: 2,
            },
            {
              type: "text",
              text: `${album.divisionName || "วิทยาลัยสารพัดช่างน่าน"}${
                album.departmentName ? ` (${album.departmentName})` : ""
              }`,
              wrap: true,
              color: "#F1F5F9",
              size: "xs",
              flex: 3,
            },
          ],
        },
        ...(album.projectCode
          ? [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "🔗 ผูกโครงการ",
                    color: "#06B6D4",
                    size: "xs",
                    flex: 2,
                  },
                  {
                    type: "text",
                    text: `${album.projectCode} ${album.projectName || ""}`.trim(),
                    wrap: true,
                    color: "#38BDF8",
                    size: "xs",
                    flex: 3,
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
      ],
    },
  };

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages: [
          {
            type: "flex",
            altText: `📢 ภาพกิจกรรมใหม่: ${album.title} (${album.photoCount} รูป)`,
            contents: flexContainer,
          },
        ],
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
 * Sends a test push message to verify LINE Messaging API credentials and target group
 */
export async function sendLineTestMessage(params?: {
  channelAccessToken?: string;
  targetGroupId?: string;
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

  const testPayload: LineAlbumNotificationPayload = {
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

