import { NextRequest, NextResponse } from "next/server";
import {
  getLineMessagingConfig,
  saveSystemSetting,
} from "@/lib/services/systemSettingService";

export const dynamic = "force-dynamic";

/**
 * GET /api/line/webhook
 * Health check for LINE Developers Console webhook verify
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "NPC_PhotoSync LINE Messaging API Webhook endpoint is live",
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/line/webhook
 * Handles incoming LINE webhook events (Join group, message, verify)
 */
export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const events = body.events || [];
    const config = await getLineMessagingConfig();
    const token = config.channelAccessToken;

    for (const event of events) {
      const source = event.source || {};
      const groupId = source.groupId || source.roomId;
      const replyToken = event.replyToken;

      // 1. Bot joined a group / room
      if (event.type === "join" && groupId) {
        console.log(`[LINE Webhook] Bot joined group: ${groupId}`);
        await saveSystemSetting(
          "LINE_LAST_DETECTED_GROUP_ID",
          groupId,
          "Last detected LINE Group ID from webhook"
        );

        if (replyToken && token) {
          await sendLineReply(token, replyToken, [
            {
              type: "text",
              text: `🎉 สวัสดีครับ บอทแจ้งเตือนคลังภาพ NPC_PhotoSync วิทยาลัยสารพัดช่างน่าน เข้าร่วมกลุ่มเรียบร้อยแล้ว!\n\n📌 Group ID ของกลุ่มนี้คือ:\n${groupId}\n\n(ผู้ดูแลระบบสามารถคัดลอกรหัสนี้ไปใส่ในหน้าจัดการระบบ เพื่อรับการแจ้งเตือนกิจกรรมใหม่ได้ทันทีครับ)`,
            },
          ]);
        }
      }

      // 2. Someone typed a message in the group
      if (event.type === "message" && event.message?.type === "text") {
        const text = (event.message.text || "").trim().toLowerCase();

        // Check if user is asking for the Group ID
        if (text === "!id" || text === "/id" || text === "groupid" || text === "id" || text === "ขอไอดีกลุ่ม") {
          if (groupId) {
            console.log(`[LINE Webhook] Group ID requested: ${groupId}`);
            await saveSystemSetting(
              "LINE_LAST_DETECTED_GROUP_ID",
              groupId,
              "Last detected LINE Group ID from webhook"
            );

            if (replyToken && token) {
              await sendLineReply(token, replyToken, [
                {
                  type: "text",
                  text: `📌 รหัสกลุ่มไลน์ (Group ID) ของกลุ่มนี้คือ:\n\n${groupId}\n\n(นำรหัสนี้ไปบันทึกในหน้าตั้งค่าระบบ NPC_PhotoSync ได้เลยครับ)`,
                },
              ]);
            }
          } else if (source.userId) {
            if (replyToken && token) {
              await sendLineReply(token, replyToken, [
                {
                  type: "text",
                  text: `📌 User ID ของคุณคือ:\n\n${source.userId}`,
                },
              ]);
            }
          }
        }
      }
    }

    // Always return 200 OK to LINE
    return NextResponse.json({ success: true, processedEvents: events.length });
  } catch (err: any) {
    console.error("LINE Webhook error:", err);
    // LINE requires 200 OK even on error to prevent retry storms
    return NextResponse.json({ success: false, error: err.message }, { status: 200 });
  }
}

/**
 * Send a reply message using LINE Messaging API
 */
async function sendLineReply(channelAccessToken: string, replyToken: string, messages: any[]) {
  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
  } catch (err) {
    console.warn("Failed to send LINE reply:", err);
  }
}
