import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AiVisionAnalysisResult {
  caption: string;
  tags: string[];
}

/**
 * Fallback tag generation based on album context when API key is missing or quota is exceeded
 */
function getContextualFallback(albumTitle: string): AiVisionAnalysisResult {
  const genericTags = ["วิทยาลัยสารพัดช่างน่าน", "กิจกรรมสถานศึกษา", "ภาพกิจกรรม"];

  if (albumTitle.includes("อบรม") || albumTitle.includes("เชิงปฏิบัติการ")) {
    genericTags.push("การอบรม", "พัฒนาทักษะ");
  } else if (albumTitle.includes("แข่งเรือ") || albumTitle.includes("ประเพณี")) {
    genericTags.push("ประเพณีเมืองน่าน", "จิตอาสา");
  } else if (albumTitle.includes("เสาธง") || albumTitle.includes("เข้าแถว")) {
    genericTags.push("หน้าเสาธง", "คุณธรรมจริยธรรม");
  } else if (albumTitle.includes("ประเมิน") || albumTitle.includes("ต้อนรับ")) {
    genericTags.push("คณะกรรมการ", "ตรวจประเมิน");
  } else {
    genericTags.push("ประชาสัมพันธ์", "บรรยากาศ");
  }

  return {
    caption: `ภาพบรรยากาศการดำเนินงาน: ${albumTitle}`,
    tags: Array.from(new Set(genericTags)).slice(0, 5),
  };
}

/**
 * Analyze an activity photo using Gemini Vision:
 * Generates an official Thai caption suitable for 5-chapter reports and 3-5 relevant tags.
 *
 * @param thumbnailBuffer WebP or JPEG buffer of the photo
 * @param albumTitle The title/context of the parent album
 * @param mimeType Image MIME type (default: image/webp)
 */
export async function analyzeActivityPhoto(
  thumbnailBuffer: Buffer,
  albumTitle: string,
  mimeType: string = "image/webp"
): Promise<AiVisionAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Graceful fallback if Gemini API Key is missing or default placeholder
  if (!apiKey || apiKey.includes("MockGemini") || apiKey.includes("AIzaSyXXXX")) {
    return getContextualFallback(albumTitle);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `
คุณเป็นผู้เชี่ยวชาญด้านงานประชาสัมพันธ์และการจัดทำรายงานสรุปโครงการ 5 บท ของวิทยาลัยสารพัดช่างน่าน (Nan Polytechnic College)
รูปภาพนี้เป็นส่วนหนึ่งของอัลบั้มกิจกรรม: "${albumTitle}"

กรุณาวิเคราะห์ภาพถ่ายและตอบกลับเป็น JSON ภาษาไทยที่มีโครงสร้างดังนี้เท่านั้น:
{
  "caption": "คำบรรยายภาพความยาว 1-2 ประโยค ภาษาทางการ เหมาะสำหรับใส่ใต้ภาพในภาคผนวกรายงานโครงการ 5 บท หรือประชาสัมพันธ์วิทยาลัย",
  "tags": ["แท็กภาษาไทย1", "แท็กภาษาไทย2", "แท็กภาษาไทย3", "แท็กภาษาไทย4"]
}

ข้อกำหนดแท็ก:
- สกัดคีย์เวิร์ดที่สำคัญ 3-5 คำ เช่น สิ่งของ, บทบาทบุคคล, สถานที่, หรือประเภทกิจกรรม (เช่น พิธีเปิด, นักศึกษา, วิทยากร, มอบเกียรติบัตร, การลงมือปฏิบัติ)
- ไม่ใส่เครื่องหมาย # นำหน้า
- ใช้คำภาษาไทยสั้นกระชับ
`;

    const imagePart = {
      inlineData: {
        data: thumbnailBuffer.toString("base64"),
        mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    if (!responseText) {
      return getContextualFallback(albumTitle);
    }

    const parsed = JSON.parse(responseText) as {
      caption?: string;
      tags?: string[];
    };

    const finalCaption =
      parsed.caption && parsed.caption.trim().length > 0
        ? parsed.caption.trim()
        : `ภาพประกอบกิจกรรม ${albumTitle}`;

    const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const sanitizedTags = rawTags
      .map((t) => String(t).replace(/[#"']/g, "").trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);

    return {
      caption: finalCaption,
      tags: sanitizedTags.length > 0 ? sanitizedTags : getContextualFallback(albumTitle).tags,
    };
  } catch (error) {
    console.error("Gemini Vision API error, falling back to contextual tags:", error);
    return getContextualFallback(albumTitle);
  }
}
