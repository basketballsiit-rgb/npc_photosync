import { NextRequest, NextResponse } from "next/server";
import {
  getLineMessagingConfig,
  saveSystemSetting,
} from "@/lib/services/systemSettingService";
import { sendLineTestMessage } from "@/lib/services/lineNotifyService";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings/line
 * Retrieve current LINE Messaging API settings
 */
export async function GET() {
  try {
    const config = await getLineMessagingConfig();

    // Mask access token for security
    let maskedToken = "";
    if (config.channelAccessToken) {
      if (config.channelAccessToken.length > 25) {
        maskedToken = `${config.channelAccessToken.substring(0, 15)}...••••••••...${config.channelAccessToken.substring(config.channelAccessToken.length - 10)}`;
      } else {
        maskedToken = "••••••••••••••••••••";
      }
    }

    return NextResponse.json({
      success: true,
      settings: {
        hasChannelAccessToken: Boolean(config.channelAccessToken && !config.channelAccessToken.includes("your-line")),
        channelAccessTokenMasked: maskedToken,
        channelSecret: config.channelSecret ? "••••••••••••••••" : "",
        hasChannelSecret: Boolean(config.channelSecret),
        targetGroupId: config.targetGroupId,
        isEnabled: config.isEnabled,
        isConfigured: config.isConfigured,
        lastDetectedGroupId: config.lastDetectedGroupId || "",
        source: config.source,
      },
    });
  } catch (error: any) {
    console.error("Error fetching LINE settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings/line
 * Save settings or run a live push test
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, channelAccessToken, channelSecret, targetGroupId, isEnabled } = body;

    // 1. Action: Test notification
    if (action === "test") {
      const testResult = await sendLineTestMessage({
        channelAccessToken,
        targetGroupId,
      });

      if (!testResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: testResult.error || "ไม่สามารถส่งข้อความทดสอบเข้ากลุ่ม LINE ได้ กรุณาตรวจสอบ Token และ Group ID",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "ส่งข้อความทดสอบเข้ากลุ่ม LINE สำเร็จเรียบร้อยแล้ว! กรุณาตรวจสอบในกลุ่มไลน์",
      });
    }

    // 2. Action: Save settings
    if (channelAccessToken !== undefined && channelAccessToken.trim() !== "") {
      // Don't overwrite with masked string
      if (!channelAccessToken.includes("••••")) {
        await saveSystemSetting(
          "LINE_CHANNEL_ACCESS_TOKEN",
          channelAccessToken.trim(),
          "LINE Messaging API Long-lived Channel Access Token"
        );
      }
    }

    if (channelSecret !== undefined && channelSecret.trim() !== "") {
      if (!channelSecret.includes("••••")) {
        await saveSystemSetting(
          "LINE_CHANNEL_SECRET",
          channelSecret.trim(),
          "LINE Messaging API Channel Secret"
        );
      }
    }

    if (targetGroupId !== undefined) {
      await saveSystemSetting(
        "LINE_TARGET_GROUP_ID",
        targetGroupId.trim(),
        "LINE Target Group ID or Chat ID"
      );
    }

    if (isEnabled !== undefined) {
      await saveSystemSetting(
        "LINE_NOTIFY_ENABLED",
        String(isEnabled),
        "LINE Push Notification Master Switch (true/false)"
      );
    }

    const updatedConfig = await getLineMessagingConfig();

    return NextResponse.json({
      success: true,
      message: "บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว",
      settings: {
        hasChannelAccessToken: Boolean(updatedConfig.channelAccessToken),
        targetGroupId: updatedConfig.targetGroupId,
        isEnabled: updatedConfig.isEnabled,
        isConfigured: updatedConfig.isConfigured,
      },
    });
  } catch (error: any) {
    console.error("Error saving LINE settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save LINE settings" },
      { status: 500 }
    );
  }
}
