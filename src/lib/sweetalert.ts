import Swal, { SweetAlertIcon } from "sweetalert2";

export const npcSwal = Swal.mixin({
  customClass: {
    popup: "npc-swal-popup",
    title: "npc-swal-title",
    htmlContainer: "npc-swal-html",
    confirmButton: "npc-swal-confirm",
    cancelButton: "npc-swal-cancel",
  },
  buttonsStyling: true,
  backdrop: "rgba(9, 5, 20, 0.8)",
});

export const showAlert = {
  success: (title: string, text?: string) => {
    return npcSwal.fire({
      icon: "success",
      title,
      text,
      confirmButtonText: "ตกลง",
      confirmButtonColor: "#ec4899",
      timer: 3500,
      timerProgressBar: true,
    });
  },

  error: (title: string, text?: string) => {
    return npcSwal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "ตกลง",
      confirmButtonColor: "#ef4444",
    });
  },

  warning: (title: string, text?: string) => {
    return npcSwal.fire({
      icon: "warning",
      title,
      text,
      confirmButtonText: "ตกลง",
      confirmButtonColor: "#f59e0b",
    });
  },

  info: (title: string, text?: string) => {
    return npcSwal.fire({
      icon: "info",
      title,
      text,
      confirmButtonText: "ตกลง",
      confirmButtonColor: "#8b5cf6",
    });
  },

  confirm: async (
    title: string,
    text?: string,
    confirmButtonText: string = "ยืนยัน",
    cancelButtonText: string = "ยกเลิก"
  ): Promise<boolean> => {
    const result = await npcSwal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: "#ec4899",
      cancelButtonColor: "#4c1d95",
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  confirmDelete: async (
    title: string,
    text?: string,
    confirmButtonText: string = "ยืนยันการลบ",
    cancelButtonText: string = "ยกเลิก"
  ): Promise<boolean> => {
    const result = await npcSwal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#4c1d95",
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  toast: (title: string, icon: SweetAlertIcon = "success") => {
    return Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#190b3b",
      color: "#ffffff",
      customClass: {
        popup: "border border-purple-800/80 rounded-2xl shadow-xl",
      },
    }).fire({
      icon,
      title,
    });
  },
};

export default showAlert;
