/**
 * 5W1H Journalism & PR News Utilities for Nan Polytechnic College
 * ตามหลักการเขียนข่าวประชาสัมพันธ์: ใคร (Who), ทำอะไร (What), ที่ไหน (Where),
 * เมื่อไร (When), เพื่ออะไร (Why), อย่างไร (How) และการแปลงเป็นข่าวแผ่นเดียว (One-Page PR Bulletin)
 */

export interface News5W1H {
  who: string;    // ใคร: ผู้บริหาร คณะครู นักเรียน วิทยากร แขกผู้มีเกียรติ
  what: string;   // ทำอะไร: พิธีเปิด กิจกรรม อบรม ประชุม มอบรางวัล
  where: string;  // ที่ไหน: สถานที่จัดกิจกรรม
  when: string;   // เมื่อไร: วันที่และเวลาจัดกิจกรรม
  why: string;    // เพื่ออะไร / วัตถุประสงค์: เป้าหมายของโครงการ/กิจกรรม
  how: string;    // อย่างไร / ผลลัพธ์: บรรยากาศ จำนวนผู้เข้าร่วม ผลการดำเนินงาน
  fullNews?: string; // เนื้อหาข่าวประชาสัมพันธ์ฉบับสมบูรณ์
}

const TAG_START = "<!--5W1H_NEWS_JSON:";
const TAG_END = ":5W1H_NEWS_JSON-->";

/**
 * Serializes 5W1H news data into the album description string
 * Keeps it human-readable while embedding structured JSON metadata safely.
 */
export function serializeNewsDescription(news: News5W1H, fullText?: string): string {
  const payload = {
    who: news.who?.trim() || "",
    what: news.what?.trim() || "",
    where: news.where?.trim() || "",
    when: news.when?.trim() || "",
    why: news.why?.trim() || "",
    how: news.how?.trim() || "",
  };

  const jsonStr = JSON.stringify(payload);
  const bodyText = (fullText || news.fullNews || "").trim();

  // Combine tag with human-readable body
  return `${TAG_START}${jsonStr}${TAG_END}\n\n${bodyText}`.trim();
}

/**
 * Parses description string to retrieve 5W1H structured news and readable text.
 * If not structured, provides intelligent fallback defaults based on album metadata.
 */
export function parseNewsDescription(
  description?: string | null,
  fallbackMeta?: {
    title?: string;
    eventDate?: string | Date;
    divisionName?: string;
    departmentName?: string;
    ownerTeacher?: string;
  }
): { news: News5W1H; fullText: string; hasStructuredNews: boolean } {
  if (!description || !description.trim()) {
    const defaultNews = createDefault5W1H(fallbackMeta);
    return {
      news: defaultNews,
      fullText: "",
      hasStructuredNews: false,
    };
  }

  const raw = description.trim();
  const startIdx = raw.indexOf(TAG_START);
  const endIdx = raw.indexOf(TAG_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const jsonContent = raw.slice(startIdx + TAG_START.length, endIdx);
      const parsed = JSON.parse(jsonContent);
      const cleanText = (raw.slice(0, startIdx) + raw.slice(endIdx + TAG_END.length)).trim();

      const news: News5W1H = {
        who: parsed.who || "",
        what: parsed.what || "",
        where: parsed.where || "",
        when: parsed.when || "",
        why: parsed.why || "",
        how: parsed.how || "",
        fullNews: cleanText,
      };

      return {
        news,
        fullText: cleanText,
        hasStructuredNews: true,
      };
    } catch (e) {
      console.warn("Failed to parse embedded 5W1H JSON:", e);
    }
  }

  // Fallback: If description doesn't have JSON tag, check for plain-text 5W1H keywords or treat as fullText
  const news = createDefault5W1H(fallbackMeta);
  news.fullNews = raw;

  return {
    news,
    fullText: raw,
    hasStructuredNews: false,
  };
}

/**
 * Creates default 5W1H template based on activity metadata
 */
export function createDefault5W1H(fallbackMeta?: {
  title?: string;
  eventDate?: string | Date;
  divisionName?: string;
  departmentName?: string;
  ownerTeacher?: string;
}): News5W1H {
  const title = fallbackMeta?.title || "กิจกรรมวิทยาลัยสารพัดช่างน่าน";
  const div = fallbackMeta?.divisionName || "ฝ่ายบริหารทรัพยากร";
  const dept = fallbackMeta?.departmentName ? ` (${fallbackMeta.departmentName})` : "";
  const teacher = fallbackMeta?.ownerTeacher ? ` โดย ${fallbackMeta.ownerTeacher}` : "";
  
  let formattedDateStr = "";
  if (fallbackMeta?.eventDate) {
    const d = new Date(fallbackMeta.eventDate);
    if (!isNaN(d.getTime())) {
      formattedDateStr = d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  return {
    who: `คณะผู้บริหาร ครู บุคลากรทางการศึกษา และนักเรียน นักศึกษา วิทยาลัยสารพัดช่างน่าน${teacher}`,
    what: `เข้าร่วมดำเนินงาน "${title}"`,
    where: "ณ วิทยาลัยสารพัดช่างน่าน",
    when: formattedDateStr ? `วันที่ ${formattedDateStr}` : "ตามกำหนดการของวิทยาลัย",
    why: `เพื่อขับเคลื่อนการจัดการศึกษาและการพัฒนาศักยภาพผู้เรียนตามแผนปฏิบัติราชการ สังกัด${div}${dept}`,
    how: "การดำเนินกิจกรรมเป็นไปด้วยความเรียบร้อย ผู้เข้าร่วมให้ความร่วมมือและได้รับความรู้และประสบการณ์อย่างเต็มที่",
    fullNews: "",
  };
}

/**
 * Automatically crafts a formal, high-impact PR press release
 * following official Vocational Education Institution standards (สอศ.).
 */
export function generateDraftNewsArticle(
  news: News5W1H,
  albumTitle: string,
  eventDate?: string | Date,
  divisionName?: string,
  departmentName?: string
): string {
  let dateText = news.when.trim();
  if (!dateText && eventDate) {
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) {
      dateText = `วันที่ ${d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;
    }
  }

  const locationText = news.where.trim() || "ณ วิทยาลัยสารพัดช่างน่าน";
  const whoText = news.who.trim() || "คณะผู้บริหาร คณะครู และนักเรียนนักศึกษา วิทยาลัยสารพัดช่างน่าน";
  const whatText = news.what.trim() || `ได้ร่วมดำเนินกิจกรรม "${albumTitle}"`;
  const whyText = news.why.trim() || "เพื่อส่งเสริมและพัฒนาทักษะวิชาชีพสู่ความเป็นเลิศ";
  const howText = news.how.trim() || "บรรยากาศในการจัดกิจกรรมเป็นไปด้วยความเรียบร้อยและได้รับความสนใจจากผู้เข้าร่วมเป็นอย่างดียิ่ง";

  const orgUnit = divisionName ? `สังกัด${divisionName}${departmentName ? ` (${departmentName})` : ""}` : "";

  return `วช.น่าน จัดกิจกรรม "${albumTitle}" ขับเคลื่อนคุณภาพการศึกษาและทักษะวิชาชีพ

เมื่อ${dateText} ${locationText} ${whoText} ได้ร่วมดำเนินงาน ${whatText} ${orgUnit} โดยมีวัตถุประสงค์${whyText}

ทั้งนี้ ${howText} ซึ่งนับเป็นอีกหนึ่งกิจกรรมสำคัญที่สะท้อนถึงความมุ่งมั่นของวิทยาลัยสารพัดช่างน่าน ในการมุ่งเน้นผลิตและพัฒนากำลังคนอาชีวศึกษาที่มีสมรรถนะสูงตอบโจทย์การพัฒนาประเทศอย่างยั่งยืน

---
ภาพ/ข่าว: งานศูนย์ดิจิทัลและสื่อสารองค์กร วิทยาลัยสารพัดช่างน่าน
ระบบคลังภาพอัจฉริยะ NPC_PhotoSync`;
}

/**
 * Generates ready-to-copy social media text (Facebook / LINE)
 */
export function formatSocialShareText(
  news: News5W1H,
  albumTitle: string,
  albumUrl: string,
  eventDate?: string | Date
): string {
  let dateText = news.when.trim();
  if (!dateText && eventDate) {
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) {
      dateText = d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }

  return `📢 ข่าวประชาสัมพันธ์ วิทยาลัยสารพัดช่างน่าน
📌 เรื่อง: ${albumTitle}
📅 วันที่: ${dateText || "ตามประกาศวิทยาลัย"}
📍 สถานที่: ${news.where || "วิทยาลัยสารพัดช่างน่าน"}

👤 ใคร (Who): ${news.who || "-"}
🎯 ทำอะไร (What): ${news.what || "-"}
💡 เพื่ออะไร (Why): ${news.why || "-"}
🌟 ผลลัพธ์/บรรยากาศ (How): ${news.how || "-"}

${news.fullNews ? `\n📖 รายละเอียดข่าว:\n${news.fullNews}\n` : ""}
🌐 ชมภาพกิจกรรมความละเอียดสูง (ต้นฉบับ 100%):
${albumUrl}

#วิทยาลัยสารพัดช่างน่าน #NPCPhotoSync #อาชีวศึกษา #เรียนดีมีความสุข`;
}
