import { getSystemSetting, saveSystemSetting } from "@/lib/services/systemSettingService";

export interface DepartmentItem {
  id: string;
  name: string;
  divisionName: string;
  isSystem?: boolean;
  createdAt?: string;
  albumCount?: number;
}

export const DEFAULT_DEPARTMENTS: DepartmentItem[] = [
  { id: "dept-1", name: "แผนกวิชาช่างยนต์", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-2", name: "แผนกวิชาช่างไฟฟ้ากำลัง", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-3", name: "แผนกวิชาช่างอิเล็กทรอนิกส์", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-4", name: "แผนกวิชาเทคโนโลยีสารสนเทศ", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-5", name: "แผนกวิชาคอมพิวเตอร์ธุรกิจ", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-6", name: "แผนกวิชาการบัญชี", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-7", name: "แผนกวิชาการตลาด", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-8", name: "แผนกวิชาคหกรรมศาสตร์", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-9", name: "แผนกวิชาการโรงแรมและการท่องเที่ยว", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-10", name: "แผนกวิชาสามัญสัมพันธ์", divisionName: "ฝ่ายวิชาการ", isSystem: true },
  { id: "dept-11", name: "งานศูนย์ดิจิทัลและสื่อสารองค์กร", divisionName: "ฝ่ายบริหารทรัพยากร", isSystem: true },
  { id: "dept-12", name: "งานกิจกรรมนักเรียนนักศึกษา", divisionName: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา", isSystem: true },
  { id: "dept-13", name: "งานโครงการพิเศษและบริการวิชาชีพ", divisionName: "ฝ่ายแผนงานและความร่วมมือ", isSystem: true },
  { id: "dept-14", name: "งานประชาสัมพันธ์", divisionName: "ฝ่ายบริหารทรัพยากร", isSystem: false },
];

const SETTING_KEY = "ORGANIZATIONAL_DEPARTMENTS_JSON";

/**
 * Get all configured departments from database with fallback to defaults
 */
export async function getDepartmentsList(): Promise<DepartmentItem[]> {
  try {
    const rawJson = await getSystemSetting(SETTING_KEY);
    if (rawJson) {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Could not read custom departments, using defaults:", error);
  }

  return DEFAULT_DEPARTMENTS;
}

/**
 * Add a new department / work
 */
export async function addDepartment(name: string, divisionName: string): Promise<DepartmentItem[]> {
  const trimmedName = name.trim();
  const trimmedDivision = divisionName.trim();

  if (!trimmedName) {
    throw new Error("กรุณาระบุชื่อแผนกวิชา/งาน");
  }

  const list = await getDepartmentsList();

  const exists = list.some(
    (d) => d.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (exists) {
    throw new Error(`ชื่อแผนกวิชา/งาน "${trimmedName}" มีอยู่ในระบบแล้ว`);
  }

  const newItem: DepartmentItem = {
    id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    divisionName: trimmedDivision || "ฝ่ายวิชาการ",
    isSystem: false,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...list, newItem];
  await saveSystemSetting(
    SETTING_KEY,
    JSON.stringify(updatedList),
    "รายการแผนกวิชาและงานภายในวิทยาลัยสารพัดช่างน่าน"
  );

  return updatedList;
}

/**
 * Update an existing department
 */
export async function updateDepartment(
  id: string,
  name: string,
  divisionName: string
): Promise<DepartmentItem[]> {
  const trimmedName = name.trim();
  const trimmedDivision = divisionName.trim();

  if (!trimmedName) {
    throw new Error("กรุณาระบุชื่อแผนกวิชา/งาน");
  }

  const list = await getDepartmentsList();
  const index = list.findIndex((d) => d.id === id);

  if (index === -1) {
    throw new Error("ไม่พบข้อมูลแผนกวิชา/งานที่ต้องการแก้ไข");
  }

  const duplicate = list.some(
    (d) => d.id !== id && d.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    throw new Error(`ชื่อแผนกวิชา/งาน "${trimmedName}" ซ้ำกับรายการอื่นในระบบ`);
  }

  const updatedList = [...list];
  updatedList[index] = {
    ...updatedList[index],
    name: trimmedName,
    divisionName: trimmedDivision || updatedList[index].divisionName,
  };

  await saveSystemSetting(
    SETTING_KEY,
    JSON.stringify(updatedList),
    "รายการแผนกวิชาและงานภายในวิทยาลัยสารพัดช่างน่าน"
  );

  return updatedList;
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string): Promise<DepartmentItem[]> {
  const list = await getDepartmentsList();
  const updatedList = list.filter((d) => d.id !== id);

  if (updatedList.length === 0) {
    throw new Error("ไม่สามารถลบแผนกวิชาทั้งหมดได้ ต้องมีอย่างน้อย 1 รายการ");
  }

  await saveSystemSetting(
    SETTING_KEY,
    JSON.stringify(updatedList),
    "รายการแผนกวิชาและงานภายในวิทยาลัยสารพัดช่างน่าน"
  );

  return updatedList;
}

/**
 * Reset departments to factory default
 */
export async function resetDepartmentsToDefault(): Promise<DepartmentItem[]> {
  await saveSystemSetting(
    SETTING_KEY,
    JSON.stringify(DEFAULT_DEPARTMENTS),
    "รายการแผนกวิชาและงานภายในวิทยาลัยสารพัดช่างน่าน"
  );
  return DEFAULT_DEPARTMENTS;
}
